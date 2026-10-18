import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { useChatSocket } from "../src/chat/hooks/useChatSocket";
import { FakeSocket, installSockets, latestSocket } from "./socket";

const params = {
  bot_id: "bot",
  isOpen: true,
  token: "old-token",
  conversationId: "conversation",
};
beforeEach(installSockets);

it("waits for authenticated conversation readiness before sending queued application frames", async () => {
  const { result } = renderHook(() => useChatSocket(params));
  await act(async () => {
    latestSocket().open();
  });
  expect(result.current.readyState).toBe("connecting");
  act(() => result.current.sendJsonMessage({ type: "form_capture" }));
  expect(latestSocket().send).toHaveBeenCalledTimes(1);
  expect(JSON.parse(latestSocket().send.mock.calls[0][0]).token).toBe(
    "old-token",
  );
  act(() =>
    latestSocket().receive({
      type: "conversation_ready",
      conversation_id: "conversation",
    }),
  );
  expect(result.current.readyState).toBe("open");
  expect(latestSocket().send).toHaveBeenCalledTimes(2);
  act(() =>
    latestSocket().receive({
      type: "conversation_ready",
      conversation_id: "conversation",
    }),
  );
  expect(latestSocket().send).toHaveBeenCalledTimes(2);
});

it("recreates the socket when credentials change even though the server URL is unchanged", async () => {
  const { rerender } = renderHook((options) => useChatSocket(options), {
    initialProps: params,
  });
  const old = latestSocket();
  rerender({
    ...params,
    token: "fresh-token",
    conversationId: "new-conversation",
  });
  expect(FakeSocket.instances).toHaveLength(2);
  expect(old.close).toHaveBeenCalled();
  await act(async () => latestSocket().open());
  expect(JSON.parse(latestSocket().send.mock.calls[0][0])).toMatchObject({
    token: "fresh-token",
    conversation_id: "new-conversation",
  });
});

it("allows an explicit reconnect with the same credentials", () => {
  const { result } = renderHook(() => useChatSocket(params));
  act(() => result.current.reconnect());
  expect(FakeSocket.instances).toHaveLength(2);
});

it("does not let a superseded socket's late close reset the replacement", async () => {
  const { result } = renderHook(() => useChatSocket(params));
  const old = latestSocket();
  act(() => result.current.reconnect());
  await act(async () => latestSocket().open());
  act(() =>
    latestSocket().receive({
      type: "conversation_ready",
      conversation_id: "conversation",
    }),
  );
  act(() => old.onclose?.(new CloseEvent("close", { code: 1006 })));
  expect(result.current.readyState).toBe("open");
  act(() => result.current.sendJsonMessage({ type: "message" }));
  expect(latestSocket().send).toHaveBeenCalledTimes(2);
});

it("requests fresh authentication on policy rejection instead of retrying rejected credentials", async () => {
  const rejected = vi.fn();
  renderHook(() =>
    useChatSocket({ ...params, onAuthenticationRejected: rejected }),
  );
  await act(async () => latestSocket().open());
  act(() => latestSocket().close(1008));
  expect(rejected).toHaveBeenCalledTimes(1);
  act(() => vi.advanceTimersByTime(60_000));
  expect(FakeSocket.instances).toHaveLength(1);
});

it("bounds retries when TCP opens but application authentication never finishes", async () => {
  const { result } = renderHook(() => useChatSocket(params));
  for (const retryDelay of [2000, 4000, 8000, 16000, 30000]) {
    await act(async () => latestSocket().open());
    act(() => vi.advanceTimersByTime(15_000 + retryDelay));
  }
  await act(async () => latestSocket().open());
  act(() => vi.advanceTimersByTime(90_000));
  expect(FakeSocket.instances).toHaveLength(6);
  expect(result.current.readyState).toBe("closed");
});


it("keeps authenticated cold startup alive without sending application frames early", async () => {
  const { result } = renderHook(() => useChatSocket(params));
  await act(async () => latestSocket().open());
  act(() => vi.advanceTimersByTime(10_000));
  act(() => latestSocket().receive({ type: "connection_authenticated", conversation_id: "conversation" }));
  act(() => result.current.sendJsonMessage({ type: "message", message: "queued" }));
  act(() => vi.advanceTimersByTime(20_000));
  expect(latestSocket().close).not.toHaveBeenCalled();
  expect(latestSocket().send).toHaveBeenCalledTimes(1);
  act(() => latestSocket().receive({ type: "conversation_ready", conversation_id: "conversation" }));
  expect(result.current.readyState).toBe("open");
  expect(latestSocket().send).toHaveBeenCalledTimes(2);
});

it("still times out when authenticated conversation setup never finishes", async () => {
  renderHook(() => useChatSocket(params));
  await act(async () => latestSocket().open());
  act(() => latestSocket().receive({ type: "connection_authenticated", conversation_id: "conversation" }));
  act(() => vi.advanceTimersByTime(30_000));
  expect(latestSocket().close).toHaveBeenCalledWith(4000, "Conversation setup timed out");
});
