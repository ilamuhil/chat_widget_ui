import { vi } from "vitest";

export class FakeSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 3;
  static instances: FakeSocket[] = [];
  readyState = FakeSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  send = vi.fn();
  close = vi.fn((code = 1000) => {
    this.readyState = FakeSocket.CLOSED;
    this.onclose?.(new CloseEvent("close", { code }));
  });

  constructor() {
    FakeSocket.instances.push(this);
  }
  open() {
    this.readyState = FakeSocket.OPEN;
    this.onopen?.(new Event("open"));
  }
  receive(payload: unknown) {
    this.onmessage?.(
      new MessageEvent("message", { data: JSON.stringify(payload) }),
    );
  }
}

export function installSockets() {
  FakeSocket.instances = [];
  vi.stubGlobal("WebSocket", FakeSocket);
}

export function latestSocket() {
  return FakeSocket.instances[FakeSocket.instances.length - 1];
}

export function token(expirySeconds = 3600) {
  return `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + expirySeconds }))}.signature`;
}
