/**
 * Client-only output latency compensation (localStorage).
 * Applied as a tick offset on WebAudio scheduling — server transport stays SSOT.
 */

export const AUDIO_LATENCY_STORAGE_KEY = "stagesync.audio.latencyCompensationMs";

export const AUDIO_LATENCY_MIN_MS = -100;
export const AUDIO_LATENCY_MAX_MS = 500;

export const AUDIO_LATENCY_CHANGED_EVENT = "stagesync:audio-latency-changed";

export function clampLatencyCompensationMs(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(
    AUDIO_LATENCY_MAX_MS,
    Math.max(AUDIO_LATENCY_MIN_MS, Math.round(value)),
  );
}

export function getStoredLatencyCompensationMs(): number {
  try {
    const raw = localStorage.getItem(AUDIO_LATENCY_STORAGE_KEY);
    if (raw == null || raw === "") return 0;
    return clampLatencyCompensationMs(Number(raw));
  } catch {
    return 0;
  }
}

function notifyLatencyChanged(ms: number): void {
  try {
    window.dispatchEvent(
      new CustomEvent(AUDIO_LATENCY_CHANGED_EVENT, { detail: { ms } }),
    );
  } catch {
    /* non-DOM / SSR */
  }
}

export function setStoredLatencyCompensationMs(ms: number): void {
  const clamped = clampLatencyCompensationMs(ms);
  try {
    if (clamped === 0) localStorage.removeItem(AUDIO_LATENCY_STORAGE_KEY);
    else localStorage.setItem(AUDIO_LATENCY_STORAGE_KEY, String(clamped));
  } catch {
    /* private mode */
  }
  notifyLatencyChanged(clamped);
}
