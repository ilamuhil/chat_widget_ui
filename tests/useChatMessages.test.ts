import { act, renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useChatMessages } from "../src/chat/hooks/useChatMessages";

it("streams one bubble and replaces it with the authoritative final answer", () => {
  const { result } = renderHook(() => useChatMessages({ toggleFormVisibility: vi.fn() }));
  const event = (payload: unknown) => act(() => result.current.handleServerJson(payload));
  event({ type: "message_delta", stream_id: "1", delta: "Hello " });
  event({ type: "message_delta", stream_id: "1", delta: "world" });
  expect(result.current.messages).toHaveLength(1);
  expect(result.current.messages[0].content).toBe("Hello world");
  event({ type: "message", role: "ai", stream_id: "1", message: "Hello world [1]" });
  event({ type: "message_delta", stream_id: "1", delta: "late" });
  expect(result.current.messages).toHaveLength(1);
  expect(result.current.messages[0].content).toBe("Hello world [1]");
  expect(result.current.messages[0].streaming).toBe(false);
});

it("removes incomplete drafts on abort or disconnect and retains completed replies", () => {
  const { result } = renderHook(() => useChatMessages({ toggleFormVisibility: vi.fn() }));
  act(() => result.current.handleServerJson({ type: "message", role: "ai", message: "Saved" }));
  act(() => result.current.handleServerJson({ type: "message_delta", stream_id: "a", delta: "partial" }));
  act(() => result.current.handleServerJson({ type: "message_abort", stream_id: "a" }));
  expect(result.current.messages).toHaveLength(1);
  act(() => result.current.handleServerJson({ type: "message_delta", stream_id: "b", delta: "partial" }));
  act(() => result.current.abortStreams());
  expect(result.current.messages.map((message) => message.content)).toEqual(["Saved"]);
});
