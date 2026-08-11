import { afterEach, describe, expect, it, vi } from "vitest";
import { createProjectSeed } from "@stagesync/shared";
import {
  assetFileUrl,
  clearAudioBufferCache,
  ensureAudioBuffered,
  getAudioBufferCacheStats,
  getFailedAudioAssetIds,
  isAudioAssetDecodeFailed,
  loadAudioBuffer,
} from "./audioPlayback.js";
import {
  cleanupAudioPlayback,
  fakeAudioBuffer,
  mockAudioContext,
  projectWithClipUnderPlayhead,
} from "./audioPlayback.test-helpers.js";

describe("audioPlayback — buffer cache", () => {
  afterEach(() => {
    cleanupAudioPlayback();
  });

  it("builds asset file URL", () => {
    expect(assetFileUrl("proj/1", "a b")).toBe(
      "/api/projects/proj%2F1/assets/a%20b/file",
    );
  });

  it("ensureAudioBuffered decodes clips under playhead (#365)", async () => {
    const fakeBuf = { duration: 1 } as AudioBuffer;
    const ctx = mockAudioContext({
      decodeAudioData: vi.fn(async () => fakeBuf),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })),
    );

    const project = projectWithClipUnderPlayhead();
    const result = await ensureAudioBuffered("p1", project, 0, ctx);
    expect(result.ready).toBe(true);
    expect(result.failedAssetIds).toEqual([]);
    expect(ctx.decodeAudioData).toHaveBeenCalledOnce();
  });

  it("ensureAudioBuffered marks decode failures (#365)", async () => {
    const ctx = mockAudioContext({
      decodeAudioData: vi.fn(async () => {
        throw new Error("bad wav");
      }),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })),
    );

    const project = projectWithClipUnderPlayhead();
    const result = await ensureAudioBuffered("p1", project, 0, ctx);
    expect(result.ready).toBe(false);
    expect(result.failedAssetIds).toEqual(["asset-1"]);
    expect(isAudioAssetDecodeFailed("p1", "asset-1")).toBe(true);
    expect(getFailedAudioAssetIds("p1")).toEqual(["asset-1"]);
  });

  it("clearAudioBufferCache drops failed markers for project", async () => {
    const ctx = mockAudioContext({
      decodeAudioData: vi.fn(async () => {
        throw new Error("bad");
      }),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        arrayBuffer: async () => new ArrayBuffer(0),
      })),
    );
    const project = projectWithClipUnderPlayhead();
    await ensureAudioBuffered("p1", project, 0, ctx);
    expect(getFailedAudioAssetIds("p1")).toEqual(["asset-1"]);
    clearAudioBufferCache("p1");
    expect(getFailedAudioAssetIds("p1")).toEqual([]);
  });

  it("late decode after clearAudioBufferCache does not re-pollute cache", async () => {
    const fakeBuf = { duration: 1, numberOfChannels: 2 } as AudioBuffer;
    let finishDecode: (buf: AudioBuffer) => void = () => {};
    const decodePromise = new Promise<AudioBuffer>((resolve) => {
      finishDecode = resolve;
    });
    const ctx = mockAudioContext({
      decodeAudioData: vi.fn(() => decodePromise),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })),
    );

    const loadPromise = loadAudioBuffer("p1", "asset-1", ctx);
    clearAudioBufferCache("p1");
    finishDecode(fakeBuf);
    await expect(loadPromise).resolves.toBeNull();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false })),
    );
    clearAudioBufferCache("p1");
    await expect(loadAudioBuffer("p1", "asset-1", ctx)).resolves.toBeNull();
  });

  it("buffer cache evicts by entry count and byte budget", async () => {
    const decoded = new Map<string, AudioBuffer>();
    const ctx = mockAudioContext({
      decodeAudioData: vi.fn(async (raw: ArrayBuffer) => {
        const id = new TextDecoder().decode(new Uint8Array(raw));
        return decoded.get(id)!;
      }),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const assetId = String(url).split("/").at(-2)!;
        return {
          ok: true,
          arrayBuffer: async () => new TextEncoder().encode(assetId).buffer,
        };
      }),
    );

    // 9 tiny entries → cap 8
    for (let i = 0; i < 9; i++) {
      const id = `small-${i}`;
      decoded.set(id, fakeAudioBuffer(1024));
      await loadAudioBuffer("p1", id, ctx);
    }
    expect(getAudioBufferCacheStats().entries).toBe(8);

    clearAudioBufferCache("p1");

    // Two ~200 MiB buffers exceed 384 MiB budget → only newest retained
    const big = 200 * 1024 * 1024;
    decoded.set("big-a", fakeAudioBuffer(big));
    decoded.set("big-b", fakeAudioBuffer(big));
    await loadAudioBuffer("p1", "big-a", ctx);
    await loadAudioBuffer("p1", "big-b", ctx);
    const stats = getAudioBufferCacheStats();
    expect(stats.entries).toBe(1);
    expect(stats.approxBytes).toBeLessThanOrEqual(stats.maxBytes);
  });

  it("loadAudioBuffer cache:false does not pin decoded PCM", async () => {
    const fakeBuf = fakeAudioBuffer(64 * 1024 * 1024);
    const ctx = mockAudioContext({
      decodeAudioData: vi.fn(async () => fakeBuf),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })),
    );

    const buf = await loadAudioBuffer("p1", "wave-only", ctx, { cache: false });
    expect(buf).toBe(fakeBuf);
    expect(getAudioBufferCacheStats().entries).toBe(0);

    await loadAudioBuffer("p1", "wave-only", ctx);
    expect(getAudioBufferCacheStats().entries).toBe(1);
  });
});
