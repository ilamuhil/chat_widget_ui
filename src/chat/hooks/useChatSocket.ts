import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type SocketReadyState = "connecting" | "open" | "closing" | "closed";

type UseChatSocketParams = {
  bot_id: string;
  isOpen: boolean;
  token: string | null;
  conversationId: string | null;
  onServerMessage?: (data: unknown) => void;
  onCloseCleanUp?: () => void;
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
  } = params;

  const socketRef = useRef<WebSocket | null>(null);
  const pendingMessagesRef = useRef<Array<Record<string, unknown>>>([]);
  const onServerMessageRef = useRef(onServerMessage);
  const onCloseRef = useRef(onCloseCleanUp);
  const tokenRef = useRef(token);
  const conversationIdRef = useRef(conversationId);
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
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

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
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      pendingMessagesRef.current.push(payload);
      return;
    }
    socket.send(JSON.stringify(payload));
  }, []);

  useEffect(() => {
    let cancelled = false;
    let attempt = 0;

    const connect = () => {
      if (cancelled || !socketUrl) return;
      manualCloseRef.current = false;
      const socket = new WebSocket(socketUrl);
      socketRef.current = socket;
      queueMicrotask(() => {
        if (!cancelled && socketRef.current === socket) {
          setReadyState("connecting");
        }
      });
      socket.onopen = () => {
        if (cancelled || socketRef.current !== socket) return;
        clearHeartbeat();
        attempt = 0;
        setReadyState("open");

        const activeToken = tokenRef.current;
        const activeConversationId = conversationIdRef.current;
        if (!activeToken || !activeConversationId) return;

        // Auth must be the first frame before any application traffic (including ping).
        socket.send(
          JSON.stringify({
            token: activeToken,
            conversation_id: activeConversationId,
            visitor_id: localStorage.getItem(`${bot_id}:visitor_id`),
          }),
        );
        for (const payload of pendingMessagesRef.current) {
          socket.send(JSON.stringify(payload));
        }
        pendingMessagesRef.current = [];

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

        // Wait for the server receive loop (bot prefs, etc.) before the first ping.
        heartbeatIntervalRef.current = setInterval(sendPing, 20000);
      };
      socket.onmessage = (evt: MessageEvent) => {
        if (cancelled || socketRef.current !== socket) return;

        const raw = evt.data;
        if (typeof raw === "string") {
          try {
            const parsed = JSON.parse(raw) as { type?: unknown };
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
        clearHeartbeat();

        const permanentFailure = event.code === 1008 || event.code === 1003;
        if (socketRef.current === socket) {
          socketRef.current = null;
        }

        // Policy / protocol rejection — retrying only storms the server.
        if (cancelled || permanentFailure) {
          setReadyState("closed");
          if (permanentFailure) onCloseRef.current?.();
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
        onCloseRef.current?.();
      };
    };
    connect();

    return () => {
      cancelled = true;
      clearHeartbeat();
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
  }, [socketUrl, isOpen, clearHeartbeat]);

  const disconnect = useCallback(() => {
    clearHeartbeat();
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = undefined;
    }
    manualCloseRef.current = true;
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
  };
}
