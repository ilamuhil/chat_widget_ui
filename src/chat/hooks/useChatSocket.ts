import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type SocketReadyState = "connecting" | "open" | "closing" | "closed";

type UseChatSocketParams = {
  bot_id: string;
  isOpen: boolean;
  token: string | null;
  conversationId: string | null;
  onServerMessage?: (data: unknown) => void;
  onCloseCleanUp?: () => void;
  onAuthenticationRejected?: () => void;
};

function toWebSocketUrl(httpOrWsUrl: string) {
  if (httpOrWsUrl.startsWith("https://"))
    return `wss://${httpOrWsUrl.slice("https://".length)}`;
  if (httpOrWsUrl.startsWith("http://"))
    return `ws://${httpOrWsUrl.slice("http://".length)}`;
  return httpOrWsUrl;
}

export function useChatSocket(params: UseChatSocketParams) {
  const {
    bot_id,
    isOpen,
    token,
    conversationId,
    onServerMessage,
    onCloseCleanUp,
    onAuthenticationRejected,
  } = params;

  const socketRef = useRef<WebSocket | null>(null);
  const pendingMessagesRef = useRef<Array<Record<string, unknown>>>([]);
  const onServerMessageRef = useRef(onServerMessage);
  const onCloseRef = useRef(onCloseCleanUp);
  const onAuthenticationRejectedRef = useRef(onAuthenticationRejected);
  const serverReadyRef = useRef(false);
  const [connectionVersion, setConnectionVersion] = useState(0);
  const heartbeatIntervalRef = useRef<
    ReturnType<typeof setInterval> | undefined
  >(undefined);
  const watchDogTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const awaitingPongRef = useRef(false);
  const manualCloseRef = useRef(false);

  const [readyState, setReadyState] = useState<SocketReadyState>("closed");

  const clearHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = undefined;
    }
    if (watchDogTimerRef.current) {
      clearTimeout(watchDogTimerRef.current);
      watchDogTimerRef.current = undefined;
    }
    awaitingPongRef.current = false;
  }, []);

  useEffect(() => {
    onServerMessageRef.current = onServerMessage;
  }, [onServerMessage]);

  useEffect(() => {
    onCloseRef.current = onCloseCleanUp;
  }, [onCloseCleanUp]);

  useEffect(() => {
    onAuthenticationRejectedRef.current = onAuthenticationRejected;
  }, [onAuthenticationRejected]);

  const wsUrl = useMemo(() => {
    const base = (
      import.meta.env.VITE_CHAT_SERVER_URL as string | undefined
    )?.trim();
    if (!base) return "";
    return `${toWebSocketUrl(base)}/api/chat/ws`;
  }, []);

  const socketUrl = useMemo(
    () => (isOpen && token && conversationId && wsUrl ? wsUrl : null),
    [isOpen, token, conversationId, wsUrl],
  );

  const sendJsonMessage = useCallback((payload: Record<string, unknown>) => {
    const socket = socketRef.current;
    if (
      !socket ||
      socket.readyState !== WebSocket.OPEN ||
      !serverReadyRef.current
    ) {
      pendingMessagesRef.current.push(payload);
      return;
    }
    socket.send(JSON.stringify(payload));
  }, []);

  useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    let startupTimer: ReturnType<typeof setTimeout> | undefined;
    const clearStartupTimer = () => {
      if (startupTimer) clearTimeout(startupTimer);
      startupTimer = undefined;
    };

    if (!socketUrl) {
      queueMicrotask(() => {
        if (!cancelled) setReadyState("closed");
      });
      return () => {
        cancelled = true;
      };
    }

    const connect = () => {
      if (cancelled || !socketUrl) return;
      manualCloseRef.current = false;
      const socket = new WebSocket(socketUrl);
      socketRef.current = socket;
      serverReadyRef.current = false;
      startupTimer = setTimeout(() => {
        if (socketRef.current === socket)
          socket.close(4000, "Connection timed out");
      }, 15_000);
      queueMicrotask(() => {
        if (!cancelled && socketRef.current === socket) {
          setReadyState("connecting");
        }
      });
      socket.onopen = () => {
        if (cancelled || socketRef.current !== socket) return;
        clearHeartbeat();
        const activeToken = token;
        const activeConversationId = conversationId;
        if (!activeToken || !activeConversationId) return;

        // Auth must be the first frame before any application traffic (including ping).
        socket.send(
          JSON.stringify({
            token: activeToken,
            conversation_id: activeConversationId,
            visitor_id: localStorage.getItem(`${bot_id}:visitor_id`),
          }),
        );
      };
      const startHeartbeat = () => {
        clearHeartbeat();
        const sendPing = () => {
          if (
            cancelled ||
            socketRef.current !== socket ||
            socket.readyState !== WebSocket.OPEN
          )
            return;
          // Avoid stacking pings if the previous pong is still outstanding.
          if (awaitingPongRef.current) return;

          socket.send(JSON.stringify({ type: "ping" }));
          awaitingPongRef.current = true;
          if (watchDogTimerRef.current) clearTimeout(watchDogTimerRef.current);
          watchDogTimerRef.current = setTimeout(() => {
            if (awaitingPongRef.current) socket.close(4000, "Ping timeout");
          }, 15000);
        };

        // Heartbeats start only after application authentication is complete.
        heartbeatIntervalRef.current = setInterval(sendPing, 20000);
      };
      socket.onmessage = (evt: MessageEvent) => {
        if (cancelled || socketRef.current !== socket) return;

        const raw = evt.data;
        if (typeof raw === "string") {
          try {
            const parsed = JSON.parse(raw) as { type?: unknown };
            if (
              parsed?.type === "connection_authenticated" &&
              (parsed as { conversation_id?: unknown }).conversation_id === conversationId
            ) {
              clearStartupTimer();
              // Authentication succeeded; allow bounded time for cold database setup.
              startupTimer = setTimeout(() => {
                if (socketRef.current === socket && !serverReadyRef.current)
                  socket.close(4000, "Conversation setup timed out");
              }, 30_000);
              return;
            }
            if (
              parsed?.type === "conversation_ready" &&
              (parsed as { conversation_id?: unknown }).conversation_id ===
                conversationId
            ) {
              clearStartupTimer();
              attempt = 0;
              serverReadyRef.current = true;
              setReadyState("open");
              startHeartbeat();
              for (const payload of pendingMessagesRef.current) {
                socket.send(JSON.stringify(payload));
              }
              pendingMessagesRef.current = [];
            }
            // Handle heartbeat before requiring a chat message handler.
            if (parsed?.type === "pong") {
              awaitingPongRef.current = false;
              if (watchDogTimerRef.current) {
                clearTimeout(watchDogTimerRef.current);
                watchDogTimerRef.current = undefined;
              }
              return;
            }
            onServerMessageRef.current?.(parsed);
          } catch {
            onServerMessageRef.current?.(raw);
          }
          return;
        }
        onServerMessageRef.current?.(raw);
      };
      socket.onclose = (event: CloseEvent) => {
        //!IMPORTANT: this runs after the disconnect function defined below.
        const isCurrent = socketRef.current === socket;
        if (isCurrent) socketRef.current = null;

        // A replacement socket already owns the connection state. A close
        // from the socket we just superseded must not mark that one closed.
        if (!isCurrent) return;
        clearStartupTimer();
        clearHeartbeat();
        serverReadyRef.current = false;
        onCloseRef.current?.();

        const permanentFailure = event.code === 1008 || event.code === 1003;
        // 1000 is a finished conversation (end chat), not a dropped network.
        const intentionalClose = event.code === 1000;

        // Policy / protocol rejection — retrying only storms the server.
        if (cancelled || permanentFailure || intentionalClose) {
          setReadyState("closed");
          if (!cancelled && event.code === 1008)
            onAuthenticationRejectedRef.current?.();
          return;
        }

        const shouldReconnect = !manualCloseRef.current;
        if (shouldReconnect && attempt < 5) {
          const delay = Math.min(30_000, 2000 * 2 ** attempt);
          attempt += 1;
          setReadyState("connecting");
          retryTimerRef.current = setTimeout(connect, delay);
          return;
        }
        setReadyState("closed");
      };
    };
    connect();

    return () => {
      cancelled = true;
      clearStartupTimer();
      clearHeartbeat();
      serverReadyRef.current = false;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = undefined;
      }
      const socket = socketRef.current;
      socketRef.current = null;
      if (
        socket &&
        (socket.readyState === WebSocket.CONNECTING ||
          socket.readyState === WebSocket.OPEN)
      ) {
        manualCloseRef.current = true;
        socket.close(1000, "Normal Closure");
      }
    };
  }, [
    socketUrl,
    isOpen,
    clearHeartbeat,
    bot_id,
    token,
    conversationId,
    connectionVersion,
  ]);

  const reconnect = useCallback(() => {
    setConnectionVersion((version) => version + 1);
  }, []);

  const disconnect = useCallback(() => {
    clearHeartbeat();
    serverReadyRef.current = false;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = undefined;
    }
    manualCloseRef.current = true;
    pendingMessagesRef.current = [];
    const socket = socketRef.current;
    if (!socket) {
      setReadyState("closed");
      return;
    }
    socket.close(1000, "Normal Closure");
  }, [clearHeartbeat]);

  return {
    sendJsonMessage,
    readyState,
    disconnect,
    reconnect,
  };
}
