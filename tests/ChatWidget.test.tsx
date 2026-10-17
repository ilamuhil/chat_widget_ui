import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import ChatWidget from "../src/chat/ChatWidget";
import { verifyChat } from "../src/api/verify";
import { installSockets, latestSocket, token } from "./socket";

const callbacks = vi.hoisted(() => ({
  appendUserMessage: vi.fn(),
  clearMessages: vi.fn(),
  handleServerJson: vi.fn(),
  clearTyping: vi.fn(),
  abortStreams: vi.fn(),
  setSender: vi.fn(),
}));
vi.mock("../src/chat/hooks/useWidgetProfile", () => ({
  useWidgetProfile: () => ({
    profile: { name: "Test bot", supportEmail: null, avatarUrl: null },
    ready: true,
  }),
}));
vi.mock("../src/api/verify", () => ({ verifyChat: vi.fn() }));
vi.mock("../src/hooks/useIsMobile", () => ({ default: () => false }));
vi.mock("../src/chat/hooks/useChatMessages", () => ({
  useChatMessages: () => ({
    ...callbacks,
    messages: [],
    isTyping: false,
    typingActor: null,
    assistancePhase: null,
    isSupportAgentConnected: false,
  }),
}));

beforeEach(() => {
  installSockets();
  vi.mocked(verifyChat).mockReset();
});

function openForm() {
  render(<ChatWidget api_key="key" bot_id="bot" theme="dark" />);
  fireEvent.click(screen.getByRole("button", { name: "Open chat" }));
  fireEvent.change(screen.getByLabelText("Name", { exact: true }), {
    target: { value: "Latency Test" },
  });
  fireEvent.change(screen.getByLabelText("Email", { exact: true }), {
    target: { value: "latency-test@example.com" },
  });
}
function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Continue to chat" }));
}
async function ready(conversation = "conversation") {
  await act(async () => {
    latestSocket().open();
    latestSocket().receive({
      type: "conversation_ready",
      conversation_id: conversation,
      form_required: true,
    });
  });
}

it("queues an early form once and submits automatically after authenticated readiness", async () => {
  let resolve!: (value: { token: string; conversation_id: string }) => void;
  vi.mocked(verifyChat).mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  openForm();
  submit();
  expect(
    screen
      .getByRole("button", { name: "Connecting…" })
      .getAttribute("disabled"),
  ).not.toBeNull();
  expect(callbacks.appendUserMessage).not.toHaveBeenCalled();
  await act(async () =>
    resolve({ token: token(), conversation_id: "conversation" }),
  );
  await act(async () => latestSocket().open());
  expect(callbacks.appendUserMessage).not.toHaveBeenCalled();
  await ready();
  expect(callbacks.appendUserMessage).toHaveBeenCalledTimes(1);
  expect(callbacks.appendUserMessage).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "Latency Test",
      email: "latency-test@example.com",
      consentToContact: false,
    }),
    true,
  );
  act(() =>
    latestSocket().receive({
      type: "conversation_ready",
      conversation_id: "conversation",
      form_required: true,
    }),
  );
  expect(callbacks.appendUserMessage).toHaveBeenCalledTimes(1);
  act(() => latestSocket().receive({ type: "form_capture" }));
  expect(
    screen
      .getByRole("button", { name: "Continue to chat" })
      .getAttribute("disabled"),
  ).toBeNull();
});

it("preserves entries and allows retry after authentication fails", async () => {
  let reject!: (error: Error) => void;
  vi.mocked(verifyChat).mockReturnValue(
    new Promise((_done, fail) => {
      reject = fail;
    }),
  );
  openForm();
  submit();
  await act(async () => reject(new Error("offline")));
  expect(
    (screen.getByLabelText("Name", { exact: true }) as HTMLInputElement).value,
  ).toBe("Latency Test");
  expect(
    screen
      .getByRole("button", { name: "Continue to chat" })
      .getAttribute("disabled"),
  ).toBeNull();
  vi.mocked(verifyChat).mockResolvedValue({
    token: token(),
    conversation_id: "conversation",
  });
  submit();
  await act(async () => {});
  await ready();
  expect(callbacks.appendUserMessage).toHaveBeenCalledTimes(1);
});

it("times out a pending form instead of sending it unexpectedly later", async () => {
  vi.mocked(verifyChat).mockResolvedValue({
    token: token(),
    conversation_id: "conversation",
  });
  openForm();
  submit();
  await act(async () => {});
  act(() => vi.advanceTimersByTime(30_000));
  expect(
    screen.getByText(/Could not connect or save your details/),
  ).toBeTruthy();
  expect(
    (screen.getByLabelText("Email", { exact: true }) as HTMLInputElement).value,
  ).toBe("latency-test@example.com");
  expect(
    screen
      .getByRole("button", { name: "Continue to chat" })
      .getAttribute("disabled"),
  ).toBeNull();
  await ready();
  expect(callbacks.appendUserMessage).not.toHaveBeenCalled();
});

it("recovers rejected cached credentials and sends the waiting form without a reload", async () => {
  localStorage.setItem("bot:token", token());
  localStorage.setItem("bot:conversation_id", "old-conversation");
  vi.mocked(verifyChat).mockResolvedValue({
    token: token(7200),
    conversation_id: "conversation",
  });
  openForm();
  submit();
  await act(async () => latestSocket().open());
  await act(async () => latestSocket().close(1008));
  expect(verifyChat).toHaveBeenCalledTimes(1);
  await ready();
  expect(callbacks.appendUserMessage).toHaveBeenCalledTimes(1);
});

it("stops refreshing repeatedly rejected authentication instead of creating an endless loop", async () => {
  localStorage.setItem("bot:token", token());
  localStorage.setItem("bot:conversation_id", "old-conversation");
  vi.mocked(verifyChat).mockResolvedValue({
    token: token(7200),
    conversation_id: "conversation",
  });
  openForm();
  submit();
  await act(async () => latestSocket().close(1008));
  await act(async () => latestSocket().close(1008));
  expect(verifyChat).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Could not connect. Please try again.")).toBeTruthy();
  expect(
    screen
      .getByRole("button", { name: "Continue to chat" })
      .getAttribute("disabled"),
  ).toBeNull();
});

it("does not resubmit a queued form when the server already knows this visitor", async () => {
  vi.mocked(verifyChat).mockResolvedValue({
    token: token(),
    conversation_id: "conversation",
  });
  openForm();
  submit();
  await act(async () => {});
  await act(async () => {
    latestSocket().open();
    latestSocket().receive({
      type: "conversation_ready",
      conversation_id: "conversation",
      form_required: false,
    });
  });
  expect(callbacks.appendUserMessage).not.toHaveBeenCalled();
  expect(localStorage.getItem("form_data")).toBe("captured");
  act(() => vi.advanceTimersByTime(30_000));
  expect(
    screen.queryByText(/Could not connect or save your details/),
  ).toBeNull();
});
