/**
 * Browser RAM pressure diagnostics for the web shell.
 * Chrome exposes `performance.memory`; elsewhere we still track StageSync-owned
 * contributors (decoded PCM cache, import buffers, etc.).
 */

export type MemoryPressureLevel = "ok" | "warn" | "critical";

export type JsHeapSnapshot = {
  usedBytes: number;
  totalBytes: number;
  limitBytes: number;
};

export type MemoryContributorSnapshot = {
  id: string;
  label: string;
  approxBytes: number;
  detail?: string;
};

export type MemoryPressureSnapshot = {
  ts: number;
  reason: string;
  level: MemoryPressureLevel;
  /** Primary human-readable cause(s) for the elevated level. */
  causes: string[];
  jsHeap: JsHeapSnapshot | null;
  contributors: MemoryContributorSnapshot[];
  contributorsBytes: number;
  extra?: Record<string, unknown>;
};

export type MemoryPressureListener = (snapshot: MemoryPressureSnapshot) => void;

export type MemoryContributor = {
  id: string;
  label: string;
  approxBytes: () => number;
  detail?: () => string | undefined;
};

/** Soft warn when Chrome JS heap is above this (decoded PCM + React). */
export const HEAP_WARN_BYTES = 1_024 * 1024 * 1024;
/** Critical heap — page is likely close to tab discard / OOM. */
export const HEAP_CRITICAL_BYTES = 1_536 * 1024 * 1024;
/** Fraction of jsHeapSizeLimit → warn. */
export const HEAP_WARN_RATIO = 0.65;
/** Fraction of jsHeapSizeLimit → critical. */
export const HEAP_CRITICAL_RATIO = 0.8;
/**
 * When `performance.memory` is missing, warn if StageSync-owned contributors
 * alone exceed this (decoded PCM is float32 — underestimates browser overhead).
 */
export const OWNED_WARN_BYTES = 512 * 1024 * 1024;
export const OWNED_CRITICAL_BYTES = 768 * 1024 * 1024;

const LOG_PREFIX = "[stagesync-mem]";
const DEFAULT_POLL_MS = 5_000;
const LOG_COOLDOWN_MS = 30_000;

type PerformanceWithMemory = Performance & {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
};

const contributors = new Map<string, MemoryContributor>();
const listeners = new Set<MemoryPressureListener>();

let monitorTimer: ReturnType<typeof setInterval> | null = null;
let lastLoggedKey = "";
let lastLoggedAt = 0;
let lastElevated: MemoryPressureSnapshot | null = null;

function readJsHeap(): JsHeapSnapshot | null {
  if (typeof performance === "undefined") return null;
  const mem = (performance as PerformanceWithMemory).memory;
  if (
    !mem ||
    typeof mem.usedJSHeapSize !== "number" ||
    typeof mem.jsHeapSizeLimit !== "number" ||
    mem.jsHeapSizeLimit <= 0
  ) {
    return null;
  }
  return {
    usedBytes: mem.usedJSHeapSize,
    totalBytes: mem.totalJSHeapSize,
    limitBytes: mem.jsHeapSizeLimit,
  };
}

function collectContributors(): MemoryContributorSnapshot[] {
  const out: MemoryContributorSnapshot[] = [];
  for (const c of contributors.values()) {
    let approxBytes = 0;
    try {
      approxBytes = Math.max(0, Math.floor(c.approxBytes()));
    } catch {
      approxBytes = 0;
    }
    let detail: string | undefined;
    try {
      detail = c.detail?.() ?? undefined;
    } catch {
      detail = undefined;
    }
    out.push({
      id: c.id,
      label: c.label,
      approxBytes,
      ...(detail ? { detail } : {}),
    });
  }
  out.sort((a, b) => b.approxBytes - a.approxBytes);
  return out;
}

export function formatBytesMb(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 100 * 1024 * 1024 ? 0 : 1)} MB`;
}

function evaluateLevel(
  jsHeap: JsHeapSnapshot | null,
  contributorsBytes: number,
): { level: MemoryPressureLevel; causes: string[] } {
  const causes: string[] = [];
  let level: MemoryPressureLevel = "ok";

  const raise = (next: MemoryPressureLevel, cause: string) => {
    causes.push(cause);
    if (next === "critical") level = "critical";
    else if (next === "warn" && level === "ok") level = "warn";
  };

  if (jsHeap) {
    const ratio = jsHeap.usedBytes / jsHeap.limitBytes;
    if (
      jsHeap.usedBytes >= HEAP_CRITICAL_BYTES ||
      ratio >= HEAP_CRITICAL_RATIO
    ) {
      raise(
        "critical",
        `sterta JS ${formatBytesMb(jsHeap.usedBytes)} / limit ${formatBytesMb(jsHeap.limitBytes)} (${Math.round(ratio * 100)}%)`,
      );
    } else if (
      jsHeap.usedBytes >= HEAP_WARN_BYTES ||
      ratio >= HEAP_WARN_RATIO
    ) {
      raise(
        "warn",
        `sterta JS ${formatBytesMb(jsHeap.usedBytes)} / limit ${formatBytesMb(jsHeap.limitBytes)} (${Math.round(ratio * 100)}%)`,
      );
    }
  } else if (contributorsBytes >= OWNED_CRITICAL_BYTES) {
    raise(
      "critical",
      `szacowane bufory StageSync ${formatBytesMb(contributorsBytes)} (bez performance.memory)`,
    );
  } else if (contributorsBytes >= OWNED_WARN_BYTES) {
    raise(
      "warn",
      `szacowane bufory StageSync ${formatBytesMb(contributorsBytes)} (bez performance.memory)`,
    );
  }

  return { level, causes };
}

/**
 * Register a named memory owner (decoded import buffer, analysis scratch, …).
 * Returns unregister.
 */
export function registerMemoryContributor(
  contributor: MemoryContributor,
): () => void {
  contributors.set(contributor.id, contributor);
  return () => {
    if (contributors.get(contributor.id) === contributor) {
      contributors.delete(contributor.id);
    }
  };
}

export function clearMemoryContributors(): void {
  contributors.clear();
}

export function collectMemorySnapshot(
  reason: string,
  extra?: Record<string, unknown>,
): MemoryPressureSnapshot {
  const jsHeap = readJsHeap();
  const contribs = collectContributors();
  const contributorsBytes = contribs.reduce((n, c) => n + c.approxBytes, 0);
  const { level, causes } = evaluateLevel(jsHeap, contributorsBytes);
  return {
    ts: Date.now(),
    reason,
    level,
    causes,
    jsHeap,
    contributors: contribs,
    contributorsBytes,
    ...(extra ? { extra } : {}),
  };
}

function logKey(snapshot: MemoryPressureSnapshot): string {
  const top = snapshot.contributors
    .slice(0, 3)
    .map((c) => `${c.id}:${formatBytesMb(c.approxBytes)}`)
    .join(",");
  return `${snapshot.level}|${snapshot.causes[0] ?? "none"}|${top}`;
}

function shouldLog(snapshot: MemoryPressureSnapshot): boolean {
  if (snapshot.level === "ok") return false;
  const key = logKey(snapshot);
  const now = Date.now();
  if (key !== lastLoggedKey) return true;
  return now - lastLoggedAt >= LOG_COOLDOWN_MS;
}

/** Compact one-line summary for console + banner tooltip. */
export function formatMemoryPressureSummary(
  snapshot: MemoryPressureSnapshot,
): string {
  const heap = snapshot.jsHeap
    ? `heap=${formatBytesMb(snapshot.jsHeap.usedBytes)}/${formatBytesMb(snapshot.jsHeap.limitBytes)}`
    : "heap=n/a";
  const owned = `owned≈${formatBytesMb(snapshot.contributorsBytes)}`;
  const top = snapshot.contributors
    .filter((c) => c.approxBytes > 0)
    .slice(0, 4)
    .map((c) => `${c.id}=${formatBytesMb(c.approxBytes)}`)
    .join(" ");
  const cause =
    snapshot.causes.length > 0 ? ` cause=${snapshot.causes.join("; ")}` : "";
  return `${snapshot.level} reason=${snapshot.reason} ${heap} ${owned}${top ? ` [${top}]` : ""}${cause}`;
}

export function userFacingMemoryPressureMessage(
  snapshot: MemoryPressureSnapshot,
): string {
  const top = snapshot.contributors.find((c) => c.approxBytes > 0);
  const hint = top
    ? ` Największy ślad: ${top.label} (~${formatBytesMb(top.approxBytes)}).`
    : "";
  if (snapshot.level === "critical") {
    return `Krytyczne użycie pamięci w przeglądarce.${hint} Szczegóły w konsoli (F12 → „${LOG_PREFIX}”). Odśwież kartę, jeśli Timeline zwalnia lub karta zaraz się zamknie.`;
  }
  return `Wysokie użycie pamięci w przeglądarce.${hint} Szczegóły w konsoli (F12 → „${LOG_PREFIX}”).`;
}

function emitLog(snapshot: MemoryPressureSnapshot): void {
  if (!shouldLog(snapshot)) return;
  lastLoggedKey = logKey(snapshot);
  lastLoggedAt = Date.now();
  const line = `${LOG_PREFIX} ${formatMemoryPressureSummary(snapshot)}`;
  const detail = {
    ts: snapshot.ts,
    reason: snapshot.reason,
    level: snapshot.level,
    causes: snapshot.causes,
    jsHeap: snapshot.jsHeap,
    contributors: snapshot.contributors,
    contributorsBytes: snapshot.contributorsBytes,
    extra: snapshot.extra,
  };
  if (snapshot.level === "critical") {
    console.error(line, detail);
  } else {
    console.warn(line, detail);
  }
}

function notifyListeners(snapshot: MemoryPressureSnapshot): void {
  for (const listener of listeners) {
    try {
      listener(snapshot);
    } catch (err) {
      console.warn(`${LOG_PREFIX} listener failed`, err);
    }
  }
}

/**
 * Collect + evaluate. Logs and notifies listeners when level is warn/critical.
 * Always returns the snapshot (also for ok — callers may inspect).
 */
export function noteMemoryCheckpoint(
  reason: string,
  extra?: Record<string, unknown>,
): MemoryPressureSnapshot {
  const snapshot = collectMemorySnapshot(reason, extra);
  if (snapshot.level !== "ok") {
    lastElevated = snapshot;
    emitLog(snapshot);
    notifyListeners(snapshot);
  } else if (lastElevated) {
    // Pressure cleared — notify once so UI can hide the banner.
    lastElevated = null;
    lastLoggedKey = "";
    notifyListeners(snapshot);
  }
  return snapshot;
}

export function subscribeMemoryPressure(
  listener: MemoryPressureListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getLastElevatedMemoryPressure(): MemoryPressureSnapshot | null {
  return lastElevated;
}

export function isMemoryPressureMonitorRunning(): boolean {
  return monitorTimer != null;
}

/** Periodic poll (default 5 s). Safe to call multiple times. */
export function startMemoryPressureMonitor(
  intervalMs: number = DEFAULT_POLL_MS,
): void {
  if (typeof window === "undefined") return;
  if (monitorTimer != null) return;
  noteMemoryCheckpoint("monitor-start");
  monitorTimer = setInterval(() => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }
    noteMemoryCheckpoint("poll");
  }, Math.max(2_000, intervalMs));
}

export function stopMemoryPressureMonitor(): void {
  if (monitorTimer != null) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
}

/** Test helper — reset module state. */
export function resetMemoryPressureForTests(): void {
  stopMemoryPressureMonitor();
  contributors.clear();
  listeners.clear();
  lastLoggedKey = "";
  lastLoggedAt = 0;
  lastElevated = null;
}
