/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getH01PerfSnapshot,
  isH01PerfEnabled,
  noteH01ConsumerRender,
  noteH01Raf,
  resetH01Perf,
  resetH01PerfEnabledCache,
  H01_PERF_STORAGE_KEY,
} from "./h01PerfProbe.js";

describe("h01PerfProbe", () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = String(v);
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    });
    resetH01PerfEnabledCache();
    window.history.replaceState({}, "", "/client");
    delete (window as { __stagesyncH01?: unknown }).__stagesyncH01;
    resetH01Perf();
  });

  afterEach(() => {
    resetH01PerfEnabledCache();
    resetH01Perf();
    window.history.replaceState({}, "", "/client");
    delete (window as { __stagesyncH01?: unknown }).__stagesyncH01;
    vi.unstubAllGlobals();
  });

  it("is disabled by default", () => {
    expect(isH01PerfEnabled("?", null)).toBe(false);
    noteH01Raf(100, true);
    noteH01ConsumerRender();
    expect(getH01PerfSnapshot().rafCalls).toBe(0);
    expect(getH01PerfSnapshot().consumerRenders).toBe(0);
    expect((window as { __stagesyncH01?: unknown }).__stagesyncH01).toBeUndefined();
  });

  it("enables via query ss_perf=h01", () => {
    expect(isH01PerfEnabled("?ss_perf=h01", null)).toBe(true);
    expect(isH01PerfEnabled("?ss_perf=other", null)).toBe(false);
  });

  it("enables via localStorage and records raf / commit / render", () => {
    localStorage.setItem(H01_PERF_STORAGE_KEY, "1");
    resetH01PerfEnabledCache();
    window.history.replaceState({}, "", "/client");

    noteH01Raf(480, true);
    noteH01Raf(480, false);
    noteH01ConsumerRender();
    noteH01ConsumerRender();

    const snap = getH01PerfSnapshot();
    expect(snap.enabled).toBe(true);
    expect(snap.rafCalls).toBe(2);
    expect(snap.displayTicksCommits).toBe(1);
    expect(snap.consumerRenders).toBe(2);
    expect(snap.lastDisplayTicks).toBe(480);
    expect(
      (window as { __stagesyncH01?: { rafCalls: number } }).__stagesyncH01
        ?.rafCalls,
    ).toBe(2);
  });

  it("reset clears counters", () => {
    localStorage.setItem(H01_PERF_STORAGE_KEY, "1");
    resetH01PerfEnabledCache();
    noteH01Raf(10, true);
    resetH01Perf();
    expect(getH01PerfSnapshot().rafCalls).toBe(0);
    expect(getH01PerfSnapshot().displayTicksCommits).toBe(0);
  });
});
