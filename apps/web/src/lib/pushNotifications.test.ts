import { afterEach, describe, expect, it, vi } from "vitest";

const mem = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => {
    mem.set(k, v);
  },
  removeItem: (k: string) => {
    mem.delete(k);
  },
  clear: () => mem.clear(),
});

vi.stubGlobal("window", {
  StageSyncNative: undefined as unknown,
});

import {
  detectPushPlatform,
  readPushEnabledPreference,
  setPushEnabledPreference,
} from "./pushNotifications.js";

describe("pushNotifications (#810)", () => {
  afterEach(() => {
    mem.clear();
    (window as { StageSyncNative?: unknown }).StageSyncNative = undefined;
  });

  it("persists enabled preference", () => {
    expect(readPushEnabledPreference()).toBe(false);
    setPushEnabledPreference(true);
    expect(readPushEnabledPreference()).toBe(true);
    setPushEnabledPreference(false);
    expect(readPushEnabledPreference()).toBe(false);
  });

  it("detects web platform by default", () => {
    expect(detectPushPlatform()).toBe("web");
  });

  it("detects android-performer from StageSyncNative bridge", () => {
    (window as { StageSyncNative?: { shellKind: () => string } }).StageSyncNative =
      { shellKind: () => "performer" };
    expect(detectPushPlatform()).toBe("android-performer");
  });
});
