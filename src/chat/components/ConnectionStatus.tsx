import type { SocketReadyState } from "../hooks/useChatSocket";
import { useState, useEffect } from "react";

export function ConnectionStatus(props: {
  readyState: SocketReadyState;
  isAuthenticating: boolean;
  authFailed: boolean;
}) {
  const [showConnectionStatus, setShowConnectionStatus] = useState(true);
  const { readyState, isAuthenticating, authFailed } = props;
  useEffect(() => {
    let timeout: number | undefined;
    if (readyState === "open") {
      timeout = window.setTimeout(() => {
        setShowConnectionStatus(false);
      }, 1000);
    } else {
      setShowConnectionStatus(true);
    }

    return () => {
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [readyState]);

  const view = authFailed
    ? {
        label: "Connection failed",
        colorClass: "chat-connection-status--error",
        dotClass: "chat-status-dot--error",
      }
    : readyState === "open"
      ? {
          label: "Connected",
          colorClass: "chat-connection-status--success",
          dotClass: "chat-status-dot--success",
        }
      : isAuthenticating ||
          readyState === "connecting" ||
          readyState === "closing"
        ? {
            label: "Connecting",
            colorClass: "chat-connection-status--neutral",
            dotClass: "chat-status-dot--neutral",
          }
        : {
            label: "Disconnected",
            colorClass: "chat-connection-status--neutral",
            dotClass: "chat-status-dot--neutral",
          };

  return (
    <div
      className={`${showConnectionStatus ? "block" : "hidden"} chat-connection-status flex items-center justify-center gap-1.5 rounded-t-lg p-1.5 text-xs ${view.colorClass}`}
    >
      <span
        className={`h-1.5 w-1.5 animate-pulse rounded-full ${view.dotClass}`}
        aria-hidden="true"
      />
      <span className="text-xs">{view.label}</span>
    </div>
  );
}
