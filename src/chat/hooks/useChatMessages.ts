import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ChatMessage,
  Role,
  ServerMessageEvent,
  ServerAssistanceEvent,
  ServerTypingEvent,
  ServerFormCapturedEvent,
  FileMessage,
  FormCaptureData,
} from "../types";
import { formatTimestamp } from "../utils/time";
import bopUrl from "../../assets/audio/bop.mp3";
import type { SocketReadyState } from "./useChatSocket";

/** Failsafe — typing must not linger if nothing clears it. */
const TYPING_FAILSAFE_MS = 45_000;
/**
 * Hold the indicator after typing stops so a short pause between keystrokes
 * does not unmount it and restart the animation.
 */
const TYPING_HIDE_BUFFER_MS = 1_400;
/** Slightly past the server handover timeout so a missed result cannot stick. */
const ASSISTANCE_FAILSAFE_MS = 200_000;
const ASSISTANCE_NOTICE_MS = 2_500;

type AssistancePhase = "searching" | "connected" | "busy" | null;
type TypingActor = "agent" | "assistant";

type Sender = {
  readyState: SocketReadyState;
  sendJsonMessage: (data: Record<string, unknown>) => void;
};

function extractText(value: unknown): string {
  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    return value
      .map((block) => {
        if (typeof block === "string") return block;
        if (!block || typeof block !== "object") return "";
        const record = block as Record<string, unknown>;
        if (typeof record.text === "string") return record.text;
        if (typeof record.content === "string") return record.content;
        return "";
      })
      .filter(Boolean)
      .join("\n\n");
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.text === "string") return record.text;
    if (typeof record.content === "string") return record.content;
  }

  return "";
}

const audio = new Audio(bopUrl);

const playBopSound = () => {
  audio.currentTime = 0;
  audio.play().catch(() => {});
};

export function useChatMessages(props: {
  toggleFormVisibility: (show?: boolean) => void;
}) {
  const { toggleFormVisibility } = props;
  const [messages, setMessages] = useState<Array<ChatMessage>>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingActor, setTypingActor] = useState<TypingActor>("assistant");
  const [assistancePhase, setAssistancePhase] = useState<AssistancePhase>(null);
  const assistancePhaseRef = useRef<AssistancePhase>(null);
  const [isSupportAgentConnected, setIsSupportAgentConnected] = useState(false);
  const senderRef = useRef<Sender | null>(null);
  const typingFailsafeRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const typingHideRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const assistanceFailsafeRef = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined);

  const setSender = useCallback((sender: Sender | null) => {
    senderRef.current = sender;
  }, []);

  const clearTypingFailsafe = useCallback(() => {
    if (typingFailsafeRef.current) {
      clearTimeout(typingFailsafeRef.current);
      typingFailsafeRef.current = undefined;
    }
  }, []);

  const clearTypingHide = useCallback(() => {
    if (typingHideRef.current) {
      clearTimeout(typingHideRef.current);
      typingHideRef.current = undefined;
    }
  }, []);

  const clearTyping = useCallback(() => {
    clearTypingFailsafe();
    clearTypingHide();
    setIsTyping(false);
  }, [clearTypingFailsafe, clearTypingHide]);

  const releaseTyping = useCallback(() => {
    clearTypingHide();
    typingHideRef.current = setTimeout(() => {
      typingHideRef.current = undefined;
      clearTypingFailsafe();
      setIsTyping(false);
    }, TYPING_HIDE_BUFFER_MS);
  }, [clearTypingFailsafe, clearTypingHide]);

  const clearAssistanceFailsafe = useCallback(() => {
    if (assistanceFailsafeRef.current) {
      clearTimeout(assistanceFailsafeRef.current);
      assistanceFailsafeRef.current = undefined;
    }
  }, []);

  const setPhase = useCallback((phase: AssistancePhase) => {
    assistancePhaseRef.current = phase;
    setAssistancePhase(phase);
  }, []);

  const clearAssistance = useCallback(() => {
    clearAssistanceFailsafe();
    setPhase(null);
  }, [clearAssistanceFailsafe, setPhase]);

  const showAssistanceResult = useCallback(
    (phase: "connected" | "busy") => {
      setPhase(phase);
      clearTyping();
      clearAssistanceFailsafe();
      assistanceFailsafeRef.current = setTimeout(() => {
        assistanceFailsafeRef.current = undefined;
        setPhase(null);
      }, ASSISTANCE_NOTICE_MS);
    },
    [clearAssistanceFailsafe, clearTyping, setPhase],
  );

  const startAssistanceSearch = useCallback(() => {
    setPhase("searching");
    clearTyping();
    clearAssistanceFailsafe();
    assistanceFailsafeRef.current = setTimeout(() => {
      assistanceFailsafeRef.current = undefined;
      setPhase(null);
    }, ASSISTANCE_FAILSAFE_MS);
  }, [clearAssistanceFailsafe, clearTyping, setPhase]);

  /**
   * Typing is server-driven via `typing` events. Do not call this (or
   * `setIsTyping(true)`) from client send/UI paths unless there is a strong,
   * documented reason — and if you do, always clear via `clearTyping` so the
   * failsafe timer cannot leak.
   */
  const enableTyping = useCallback(
    (actor: TypingActor) => {
      clearTypingHide();
      setTypingActor(actor);
      setIsTyping(true);
      clearTypingFailsafe();
      typingFailsafeRef.current = setTimeout(() => {
        typingFailsafeRef.current = undefined;
        setIsTyping(false);
      }, TYPING_FAILSAFE_MS);
    },
    [clearTypingFailsafe, clearTypingHide],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    clearTyping();
    clearAssistance();
    setIsSupportAgentConnected(false);
  }, [clearAssistance, clearTyping]);

  useEffect(() => {
    return () => {
      clearTypingFailsafe();
      clearTypingHide();
      clearAssistanceFailsafe();
    };
  }, [clearAssistanceFailsafe, clearTypingFailsafe, clearTypingHide]);

  const resolveDisplayRole = useCallback(
    (role: unknown): Role => {
      if (role === "user") return "user";
      if (role === "support_agent") return "support_agent";
      if (role === "ai") return "ai";
      // System text is attributed to whoever is currently handling the chat.
      return isSupportAgentConnected ? "support_agent" : "ai";
    },
    [isSupportAgentConnected],
  );

  const appendUserMessage = useCallback(
    (
      content: string | FormCaptureData | FileMessage,
      isFormCaptureData: boolean = false,
    ) => {
      //Send the message to the server.
      const sender = senderRef.current;
      let type: "message" | "file" | "form_capture" = "message";
      if (sender) {
        //3 types of message are sent to the server : file message indicating that a file has been uploaded to the server.
        //form capture message indicating that the user has filled the form details.
        //ordinary text messages indicating that the user has sent a message to the assistant.
        let payload: string;
        if (typeof content === "string") {
          type = "message";
          payload = content;
        } else if ("file_key" in content) {
          type = "file";
          payload = content.file_key;
        } else {
          type = "form_capture";
          payload = `${content.name}:${content.email}:${content.phone}`;
        }
        sender.sendJsonMessage({
          type,
          content: payload,
        });
        toggleFormVisibility();
        playBopSound();
        // Typing indicator is owned by server `typing` events — do not enable here.
      }

      //Update the ui if this is not a form capture message.
      if (!isFormCaptureData) {
        const outgoing: ChatMessage = {
          role: "user",
          content: content as string,
          contentType: isFormCaptureData ? "form_capture" : "message",
          timestamp: formatTimestamp(new Date()),
        };
        setMessages((prev) => [...prev, outgoing]);
      }
    },
    [toggleFormVisibility],
  );

  const handleServerJson = useCallback(
    (payload: unknown) => {
      if (!payload) return;

      if (typeof payload !== "object" || payload === null) return;
      const obj = payload as Record<string, unknown>;

      // Counsellor search is a system event — never a chat bubble.
      if (obj.type === "assistance" && typeof obj.status === "string") {
        const ev = obj as ServerAssistanceEvent;
        if (ev.status === "searching") startAssistanceSearch();
        else if (ev.status === "connected" || ev.status === "busy") {
          showAssistanceResult(ev.status);
        }
        return;
      }

      // Typing is a system event — never a chat bubble.
      // Server shape: { type: "typing", from: "system", is_typing, conversation_id }
      if (obj.type === "typing") {
        if (obj.from === "system" && typeof obj.is_typing === "boolean") {
          const ev = obj as ServerTypingEvent;
          if (ev.is_typing) {
            enableTyping(ev.actor === "support_agent" ? "agent" : "assistant");
          } else {
            releaseTyping();
          }
        }
        return;
      }

      // Form-capture events drive the form UI, not bubble role attribution.
      if (obj.type === "form_required") {
        toggleFormVisibility(true);
        return;
      }

      if (obj.type === "form_capture") {
        const ev = obj as unknown as ServerFormCapturedEvent;
        toggleFormVisibility(false);
        if (ev.message) {
          setMessages((prev) => [
            ...prev,
            {
              role: resolveDisplayRole("system"),
              content: ev.message,
              contentType: "text",
              timestamp: formatTimestamp(new Date()),
            },
          ]);
        }
        clearTyping();
        return;
      }

      // Regular / system text messages
      const ev = obj as unknown as ServerMessageEvent;
      const content = extractText(ev.content) || extractText(ev.message);
      if (!content) return;

      const role = resolveDisplayRole(ev.role);
      if (role === "support_agent") {
        setIsSupportAgentConnected(true);
        if (assistancePhaseRef.current === "searching") {
          showAssistanceResult("connected");
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          role,
          content,
          contentType: "text",
          timestamp: formatTimestamp(new Date()),
          ...(typeof ev.agentName === "string"
            ? { agentName: ev.agentName }
            : null),
        } as ChatMessage,
      ]);
      clearTyping();
    },
    [
      toggleFormVisibility,
      clearAssistance,
      clearTyping,
      enableTyping,
      releaseTyping,
      resolveDisplayRole,
      showAssistanceResult,
      startAssistanceSearch,
    ],
  );

  return {
    messages,
    isTyping,
    typingActor,
    assistancePhase,
    isSupportAgentConnected,
    appendUserMessage,
    clearMessages,
    handleServerJson,
    clearTyping,
    setSender,
  };
}
