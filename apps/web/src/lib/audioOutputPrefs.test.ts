import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  AUDIO_OUTPUT_STORAGE_KEY,
  applyAudioOutputSink,
  getStoredAudioOutputDeviceId,
  setStoredAudioOutputDeviceId,
} from "./audioOutputPrefs.js";

describe("audioOutputPrefs", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores and clears device id", () => {
    expect(getStoredAudioOutputDeviceId()).toBeNull();
    setStoredAudioOutputDeviceId("sink-1");
    expect(getStoredAudioOutputDeviceId()).toBe("sink-1");
    expect(store.get(AUDIO_OUTPUT_STORAGE_KEY)).toBe("sink-1");
    setStoredAudioOutputDeviceId(null);
    expect(getStoredAudioOutputDeviceId()).toBeNull();
  });

  it("applyAudioOutputSink calls setSinkId", async () => {
    const setSinkId = vi.fn(async () => undefined);
    await applyAudioOutputSink("dev-a", {
      setSinkId,
    } as unknown as AudioContext);
    expect(setSinkId).toHaveBeenCalledWith("dev-a");
    await applyAudioOutputSink(null, {
      setSinkId,
    } as unknown as AudioContext);
    expect(setSinkId).toHaveBeenCalledWith("");
  });
});
