import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  AUDIO_OUTPUT_STORAGE_KEY,
  applyAudioOutputSink,
  getStoredAudioOutputDeviceId,
  listAudioOutputDevices,
  restoreAudioOutputSink,
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

  it("listAudioOutputDevices filters audiooutput", async () => {
    vi.stubGlobal("navigator", {
      mediaDevices: {
        enumerateDevices: async () => [
          { kind: "audiooutput", deviceId: "o1", label: "Out" },
          { kind: "audioinput", deviceId: "i1", label: "In" },
        ],
      },
    });
    const list = await listAudioOutputDevices();
    expect(list).toHaveLength(1);
    expect(list[0]!.deviceId).toBe("o1");
  });

  it("listAudioOutputDevices returns [] without enumerateDevices", async () => {
    vi.stubGlobal("navigator", { mediaDevices: {} });
    expect(await listAudioOutputDevices()).toEqual([]);
  });

  it("applyAudioOutputSink throws without setSinkId", async () => {
    await expect(
      applyAudioOutputSink("x", {} as AudioContext),
    ).rejects.toThrow(/setSinkId/);
  });

  it("restoreAudioOutputSink no-ops without stored id and swallows apply errors", async () => {
    await restoreAudioOutputSink({ setSinkId: vi.fn() } as unknown as AudioContext);
    setStoredAudioOutputDeviceId("gone");
    await restoreAudioOutputSink({
      setSinkId: vi.fn(async () => {
        throw new Error("missing device");
      }),
    } as unknown as AudioContext);
  });

  it("get/set tolerate private-mode throws", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    });
    expect(getStoredAudioOutputDeviceId()).toBeNull();
    expect(() => setStoredAudioOutputDeviceId("x")).not.toThrow();
  });

});
