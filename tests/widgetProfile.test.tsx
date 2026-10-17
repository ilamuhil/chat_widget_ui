import { act, render, renderHook, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import {
  DEFAULT_WIDGET_PROFILE,
  loadWidgetProfile,
  preloadAvatar,
} from "../src/api/widgetProfile";
import { useWidgetProfile } from "../src/chat/hooks/useWidgetProfile";
import WidgetHeader from "../src/chat/WidgetHeader";

const profile = {
  ...DEFAULT_WIDGET_PROFILE,
  id: "bot",
  name: "Admissions guide",
  instituteName: "Northbridge",
  supportEmail: "admissions@example.com",
  supportTeamName: "Admissions team",
  humanReplyMinutes: 15,
  supportHours: "Mon–Fri, 9am–5pm IST",
  helpCenterUrl: "https://example.com/help",
};
beforeEach(() => {
  vi.stubEnv("VITE_API_URL_BASE", "http://localhost:4000");
});

it("fetches the profile on mount without creating a chat or fetching a token", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ profile }) });
  vi.stubGlobal("fetch", fetch);
  const { result } = renderHook(() => useWidgetProfile("key", "bot"));
  expect(result.current.ready).toBe(false);
  await act(async () => {});
  expect(result.current.ready).toBe(true);
  expect(result.current.profile.name).toBe(profile.name);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toBe(
    "http://localhost:4000/api/widget/config",
  );
});

it("deduplicates concurrent preloads for the same bot and key", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ profile }) }),
  );
  const first = loadWidgetProfile("dedupe-key", "bot");
  const second = loadWidgetProfile("dedupe-key", "bot");
  expect(first).toBe(second);
  await first;
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("falls back cleanly when the profile service fails", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  const { result } = renderHook(() => useWidgetProfile("failed", "bot"));
  await act(async () => {});
  expect(result.current.ready).toBe(true);
  expect(result.current.profile.supportEmail).toBeNull();
  expect(result.current.profile.humanReplyMinutes).toBeNull();
});

it("rejects a different bot's response", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ profile: { ...profile, id: "different" } }),
    }),
  );
  await expect(loadWidgetProfile("wrong-bot", "bot")).rejects.toThrow(
    "Invalid widget profile",
  );
});

it("keeps the default avatar when blank or when loading fails or times out", async () => {
  expect(await preloadAvatar(null)).toBeNull();
  const image: {
    onload: (() => void) | null;
    onerror: (() => void) | null;
    src: string;
  } = { onload: null, onerror: null, src: "" };
  vi.stubGlobal(
    "Image",
    class {
      set onload(value: (() => void) | null) {
        image.onload = value;
      }
      set onerror(value: (() => void) | null) {
        image.onerror = value;
      }
      src = "";
    },
  );
  const failed = preloadAvatar("https://example.com/missing.png");
  image!.onerror!();
  expect(await failed).toBeNull();
  const timedOut = preloadAvatar("https://example.com/slow.png");
  await vi.advanceTimersByTimeAsync(2500);
  expect(await timedOut).toBeNull();
  const loaded = preloadAvatar("https://example.com/avatar.png");
  image!.onload!();
  expect(await loaded).toBe("https://example.com/avatar.png");
});

it("waits for the avatar before marking the profile ready", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        profile: { ...profile, avatarUrl: "https://example.com/avatar.png" },
      }),
    }),
  );
  let onload: (() => void) | null = null;
  vi.stubGlobal(
    "Image",
    class {
      set onload(value: (() => void) | null) {
        onload = value;
      }
      onerror = null;
      src = "";
    },
  );
  const { result } = renderHook(() => useWidgetProfile("avatar-key", "bot"));
  await act(async () => {});
  expect(result.current.ready).toBe(false);
  await act(async () => {
    onload!();
  });
  expect(result.current.ready).toBe(true);
});

it("shows configured identity and links, and reply estimates only in human mode", () => {
  const props = {
    profile,
    humanMode: false,
    agentConnected: false,
    isMobile: false,
    isFullscreen: false,
    onToggleFullscreen: vi.fn(),
    onClose: vi.fn(),
  };
  const { rerender } = render(<WidgetHeader {...props} />);
  expect(screen.getByText("Admissions guide")).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "Email support" }).getAttribute("href"),
  ).toBe("mailto:admissions@example.com");
  expect(
    screen.getByRole("link", { name: "Help centre" }).getAttribute("href"),
  ).toBe(profile.helpCenterUrl);
  expect(screen.queryByText(/Typically replies/)).toBeNull();
  rerender(<WidgetHeader {...props} humanMode />);
  expect(screen.getByText("Typically replies within 15 min")).toBeTruthy();
  rerender(<WidgetHeader {...props} profile={DEFAULT_WIDGET_PROFILE} />);
  expect(screen.queryByRole("link", { name: "Email support" })).toBeNull();
  expect(screen.queryByRole("link", { name: "Help centre" })).toBeNull();
});
