import { describe, expect, it } from "vitest";
import {
  WS_RECONNECT_BASE_MS,
  WS_RECONNECT_MAX_MS,
  wsReconnectDelayMs,
} from "./wsReconnect.js";

describe("wsReconnectDelayMs", () => {
  it("doubles until max with zero jitter", () => {
    const flat = () => 0.5; // jitter 0
    expect(wsReconnectDelayMs(0, flat)).toBe(WS_RECONNECT_BASE_MS);
    expect(wsReconnectDelayMs(1, flat)).toBe(2000);
    expect(wsReconnectDelayMs(2, flat)).toBe(4000);
    expect(wsReconnectDelayMs(3, flat)).toBe(8000);
    expect(wsReconnectDelayMs(4, flat)).toBe(WS_RECONNECT_MAX_MS);
    expect(wsReconnectDelayMs(10, flat)).toBe(WS_RECONNECT_MAX_MS);
  });

  it("applies ±200ms jitter", () => {
    expect(wsReconnectDelayMs(0, () => 1)).toBe(1200);
    expect(wsReconnectDelayMs(0, () => 0)).toBe(800);
  });
});
