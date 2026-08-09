/**
 * H-01 (Client Grid/Karaoke perf) — opt-in counters for HW / DevTools profiling.
 *
 * Enable: `?ss_perf=h01` in the Client URL, or `localStorage.stagesync_perf_h01=1`
 * then reload. Read: `window.__stagesyncH01` (rafCalls, displayTicksCommits,
 * consumerRenders, Hz estimates). See docs/guides/MOBILE.md § H-01.
 *
 * Does not change transport behaviour when disabled.
 */

export const H01_PERF_STORAGE_KEY = "stagesync_perf_h01";
export const H01_PERF_QUERY_VALUE = "h01";

export type H01PerfSnapshot = {
  enabled: boolean;
  rafCalls: number;
  /** Times `setDisplayTicks` committed a new integer (not bailed). */
  displayTicksCommits: number;
  /** ClientShell (or other) render probes while playing. */
  consumerRenders: number;
  lastDisplayTicks: number | null;
  startedAtMs: number;
  /** Approximate rAF rate since start (null until ≥250 ms elapsed). */
  rafHz: number | null;
  /** Approximate commit rate since start. */
  commitHz: number | null;
  /** Approximate consumer render rate since start. */
  renderHz: number | null;
};

type H01PerfWindow = Window & {
  __stagesyncH01?: H01PerfSnapshot & {
    reset: () => void;
    refresh: () => H01PerfSnapshot;
  };
};

let enabledCache: boolean | null = null;
let rafCalls = 0;
let displayTicksCommits = 0;
let consumerRenders = 0;
let lastDisplayTicks: number | null = null;
let startedAtMs = 0;

function nowMs(): number {
  return typeof performance !== "undefined" &&
    typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

function hz(count: number, elapsedMs: number): number | null {
  if (elapsedMs < 250) return null;
  return Math.round((count * 1000) / elapsedMs);
}

function readQueryEnabled(search: string): boolean {
  try {
    const params = new URLSearchParams(
      search.startsWith("?") ? search.slice(1) : search,
    );
    return params.get("ss_perf") === H01_PERF_QUERY_VALUE;
  } catch {
    return false;
  }
}

function readStorageEnabled(storage: Storage | null | undefined): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(H01_PERF_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Pure enable check (tests + boot). Pass search/storage to avoid globals. */
export function isH01PerfEnabled(
  search?: string,
  storage?: Storage | null,
): boolean {
  const q =
    search ?? (typeof window !== "undefined" ? window.location.search : "");
  const store =
    storage !== undefined
      ? storage
      : typeof localStorage !== "undefined"
        ? localStorage
        : null;
  return readQueryEnabled(q) || readStorageEnabled(store);
}

export function resetH01PerfEnabledCache(): void {
  enabledCache = null;
}

function ensureEnabled(): boolean {
  if (enabledCache === null) {
    enabledCache = isH01PerfEnabled();
    if (enabledCache) {
      startedAtMs = nowMs();
      publishToWindow();
    }
  }
  return enabledCache;
}

function buildSnapshot(): H01PerfSnapshot {
  const elapsed = Math.max(0, nowMs() - startedAtMs);
  return {
    enabled: enabledCache === true,
    rafCalls,
    displayTicksCommits,
    consumerRenders,
    lastDisplayTicks,
    startedAtMs,
    rafHz: hz(rafCalls, elapsed),
    commitHz: hz(displayTicksCommits, elapsed),
    renderHz: hz(consumerRenders, elapsed),
  };
}

function publishToWindow(): void {
  if (typeof window === "undefined") return;
  const w = window as H01PerfWindow;
  w.__stagesyncH01 = {
    ...buildSnapshot(),
    reset: resetH01Perf,
    refresh: () => {
      const snap = buildSnapshot();
      if (w.__stagesyncH01) {
        Object.assign(w.__stagesyncH01, snap);
      }
      return snap;
    },
  };
}

export function resetH01Perf(): void {
  rafCalls = 0;
  displayTicksCommits = 0;
  consumerRenders = 0;
  lastDisplayTicks = null;
  startedAtMs = nowMs();
  if (ensureEnabled()) publishToWindow();
}

/** Call once per rAF soft-clock sample. `committed` = ticks value changed. */
export function noteH01Raf(ticks: number, committed: boolean): void {
  if (!ensureEnabled()) return;
  rafCalls += 1;
  lastDisplayTicks = ticks;
  if (committed) displayTicksCommits += 1;
  publishToWindow();
}

/** Call from a Client consumer that re-renders on `useTransport`. */
export function noteH01ConsumerRender(): void {
  if (!ensureEnabled()) return;
  consumerRenders += 1;
  publishToWindow();
}

export function getH01PerfSnapshot(): H01PerfSnapshot {
  ensureEnabled();
  return buildSnapshot();
}
