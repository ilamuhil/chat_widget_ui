import { useCallback, useEffect, useRef } from "react";

/** Quiet period before we tell the other side that typing has stopped. */
const TYPING_IDLE_MS = 2_200;

/**
 * Emits typing activity without a start/stop on every key.
 * `true` is sent once when typing begins, then `false` only after the field
 * has been idle. Returns false from `onActivity` to retry on the next change
 * (for example while the socket is still connecting).
 */
export function useTypingActivity(
  onActivity: ((active: boolean) => boolean) | undefined,
) {
  const onActivityRef = useRef(onActivity);
  const activeRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    onActivityRef.current = onActivity;
  }, [onActivity]);

  const stopTyping = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    if (!activeRef.current) return;
    activeRef.current = false;
    onActivityRef.current?.(false);
  }, []);

  const noteTyping = useCallback(() => {
    if (!activeRef.current) {
      const sent = onActivityRef.current?.(true);
      if (sent === false) return;
      activeRef.current = true;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = undefined;
      if (!activeRef.current) return;
      activeRef.current = false;
      onActivityRef.current?.(false);
    }, TYPING_IDLE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (activeRef.current) onActivityRef.current?.(false);
    };
  }, []);

  return { noteTyping, stopTyping };
}
