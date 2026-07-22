/** Exponential backoff with jitter for WS reconnect (1→2→4… max 10s, ±200ms). */

export const WS_RECONNECT_BASE_MS = 1000;
export const WS_RECONNECT_MAX_MS = 10_000;
export const WS_RECONNECT_JITTER_MS = 200;

export function wsReconnectDelayMs(
  attempt: number,
  random: () => number = Math.random,
): number {
  const exp = Math.max(0, Math.floor(attempt));
  const base = Math.min(
    WS_RECONNECT_MAX_MS,
    WS_RECONNECT_BASE_MS * 2 ** exp,
  );
  const jitter = (random() * 2 - 1) * WS_RECONNECT_JITTER_MS;
  return Math.max(0, Math.round(base + jitter));
}
