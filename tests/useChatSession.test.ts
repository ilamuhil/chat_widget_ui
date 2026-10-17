import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { useChatSession } from "../src/chat/hooks/useChatSession";
import { verifyChat } from "../src/api/verify";
import { token } from "./socket";

vi.mock("../src/api/verify", () => ({ verifyChat: vi.fn() }));
beforeEach(() => vi.mocked(verifyChat).mockReset());

it("can refresh rejected credentials even when cached expiry looks valid", async () => {
  localStorage.setItem("bot:token", token());
  localStorage.setItem("bot:conversation_id", "old-conversation");
  vi.mocked(verifyChat).mockResolvedValue({
    token: token(7200),
    conversation_id: "new-conversation",
  });
  const { result } = renderHook(() =>
    useChatSession({ api_key: "key", bot_id: "bot" }),
  );
  await act(async () => result.current.ensureSession());
  expect(verifyChat).not.toHaveBeenCalled();
  await act(async () => result.current.ensureSession(true));
  expect(verifyChat).toHaveBeenCalledTimes(1);
  expect(result.current.conversationId).toBe("new-conversation");
});

it("deduplicates simultaneous authentication requests", async () => {
  let resolve!: (value: { token: string; conversation_id: string }) => void;
  vi.mocked(verifyChat).mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const { result } = renderHook(() =>
    useChatSession({ api_key: "key", bot_id: "bot" }),
  );
  let first!: Promise<void>;
  let second!: Promise<void>;
  act(() => {
    first = result.current.ensureSession();
    second = result.current.ensureSession();
  });
  expect(first).toBe(second);
  await act(async () => {
    resolve({ token: token(), conversation_id: "new-conversation" });
    await first;
  });
  expect(verifyChat).toHaveBeenCalledTimes(1);
});

it("honors forced refresh while a cached-session check is still settling", async () => {
  localStorage.setItem("bot:token", token());
  localStorage.setItem("bot:conversation_id", "old-conversation");
  vi.mocked(verifyChat).mockResolvedValue({
    token: token(7200),
    conversation_id: "new-conversation",
  });
  const { result } = renderHook(() =>
    useChatSession({ api_key: "key", bot_id: "bot" }),
  );
  await act(async () => {
    const cached = result.current.ensureSession();
    const forced = result.current.ensureSession(true);
    await Promise.all([cached, forced]);
  });
  expect(verifyChat).toHaveBeenCalledTimes(1);
  expect(result.current.conversationId).toBe("new-conversation");
});
