/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  HEAP_CRITICAL_BYTES,
  HEAP_WARN_BYTES,
  OWNED_CRITICAL_BYTES,
  OWNED_WARN_BYTES,
  collectMemorySnapshot,
  formatBytesMb,
  formatMemoryPressureSummary,
  isMemoryPressureMonitorRunning,
  noteMemoryCheckpoint,
  registerMemoryContributor,
  resetMemoryPressureForTests,
  startMemoryPressureMonitor,
  stopMemoryPressureMonitor,
  subscribeMemoryPressure,
  userFacingMemoryPressureMessage,
} from "./memoryPressure.js";

function stubHeap(used: number, limit = 4 * 1024 * 1024 * 1024) {
  Object.defineProperty(performance, "memory", {
    configurable: true,
    value: {
      usedJSHeapSize: used,
      totalJSHeapSize: used,
      jsHeapSizeLimit: limit,
    },
  });
}

function clearHeap() {
  Reflect.deleteProperty(performance, "memory");
}

beforeEach(() => {
  resetMemoryPressureForTests();
  clearHeap();
});

afterEach(() => {
  resetMemoryPressureForTests();
  clearHeap();
  vi.restoreAllMocks();
});

describe("memoryPressure", () => {
  it("formatBytesMb rounds large values", () => {
    expect(formatBytesMb(0)).toBe("0 MB");
    expect(formatBytesMb(1.5 * 1024 * 1024)).toBe("1.5 MB");
    expect(formatBytesMb(256 * 1024 * 1024)).toBe("256 MB");
  });

  it("stays ok under normal heap and empty contributors", () => {
    stubHeap(200 * 1024 * 1024);
    const snap = collectMemorySnapshot("test");
    expect(snap.level).toBe("ok");
    expect(snap.causes).toEqual([]);
  });

  it("warns on high JS heap and builds a console summary", () => {
    stubHeap(HEAP_WARN_BYTES + 1);
    registerMemoryContributor({
      id: "audio-buffer-cache",
      label: "Cache PCM",
      approxBytes: () => 180 * 1024 * 1024,
    });
    const snap = collectMemorySnapshot("poll");
    expect(snap.level).toBe("warn");
    expect(snap.causes[0]).toMatch(/sterta JS/);
    expect(formatMemoryPressureSummary(snap)).toMatch(/warn reason=poll/);
    expect(formatMemoryPressureSummary(snap)).toMatch(/audio-buffer-cache=/);
    expect(userFacingMemoryPressureMessage(snap)).toMatch(
      /Wysokie użycie pamięci/,
    );
    expect(userFacingMemoryPressureMessage(snap)).toMatch(/Cache PCM/);
  });

  it("marks critical heap and uses error-level copy", () => {
    stubHeap(HEAP_CRITICAL_BYTES + 1);
    const snap = collectMemorySnapshot("poll");
    expect(snap.level).toBe("critical");
    expect(userFacingMemoryPressureMessage(snap)).toMatch(
      /Krytyczne użycie pamięci/,
    );
  });

  it("falls back to owned-buffer thresholds without performance.memory", () => {
    registerMemoryContributor({
      id: "import-local-audio",
      label: "Import",
      approxBytes: () => OWNED_WARN_BYTES,
    });
    expect(collectMemorySnapshot("import").level).toBe("warn");

    registerMemoryContributor({
      id: "import-local-audio",
      label: "Import",
      approxBytes: () => OWNED_CRITICAL_BYTES,
    });
    expect(collectMemorySnapshot("import").level).toBe("critical");
  });

  it("logs and notifies on elevated checkpoints; clears on ok", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const listener = vi.fn();
    subscribeMemoryPressure(listener);

    stubHeap(HEAP_WARN_BYTES + 10);
    const elevated = noteMemoryCheckpoint("audio-cache-evict", {
      key: "p1:a",
    });
    expect(elevated.level).toBe("warn");
    expect(warn).toHaveBeenCalled();
    expect(String(warn.mock.calls[0]![0])).toMatch(/\[stagesync-mem\]/);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ level: "warn", reason: "audio-cache-evict" }),
    );

    stubHeap(50 * 1024 * 1024);
    listener.mockClear();
    const cleared = noteMemoryCheckpoint("poll");
    expect(cleared.level).toBe("ok");
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ level: "ok" }),
    );
  });

  it("rate-limits repeated identical warn logs", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    stubHeap(HEAP_WARN_BYTES + 1);
    noteMemoryCheckpoint("poll");
    noteMemoryCheckpoint("poll");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("starts and stops the poll monitor", () => {
    vi.useFakeTimers();
    const listener = vi.fn();
    subscribeMemoryPressure(listener);
    stubHeap(HEAP_WARN_BYTES + 1);
    startMemoryPressureMonitor(2_000);
    expect(isMemoryPressureMonitorRunning()).toBe(true);
    listener.mockClear();
    vi.advanceTimersByTime(2_000);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "poll", level: "warn" }),
    );
    stopMemoryPressureMonitor();
    expect(isMemoryPressureMonitorRunning()).toBe(false);
    listener.mockClear();
    vi.advanceTimersByTime(4_000);
    expect(listener).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
