/**
 * Pure transport loop helpers — inclusive start / exclusive end (ticks).
 */

export type TransportLoop = {
  enabled: boolean;
  startTicks: number;
  endTicks: number;
};

export function isUsableLoop(
  loop: TransportLoop | null | undefined,
): loop is TransportLoop {
  if (!loop) return false;
  return (
    Number.isInteger(loop.startTicks) &&
    Number.isInteger(loop.endTicks) &&
    loop.endTicks > loop.startTicks
  );
}

/** Normalize; returns null when range unusable (keeps enabled=false shell). */
export function normalizeLoop(
  raw: Partial<TransportLoop> | null | undefined,
): TransportLoop | null {
  if (!raw) return null;
  const startTicks = Math.trunc(Number(raw.startTicks));
  const endTicks = Math.trunc(Number(raw.endTicks));
  if (
    !Number.isSafeInteger(startTicks) ||
    !Number.isSafeInteger(endTicks) ||
    endTicks <= startTicks
  ) {
    return null;
  }
  return {
    enabled: Boolean(raw.enabled),
    startTicks,
    endTicks,
  };
}

/**
 * If playing past exclusive end, wrap to start; else null (no change).
 */
export function loopWrapTicks(
  positionTicks: number,
  loop: TransportLoop | null | undefined,
): number | null {
  if (!loop?.enabled || !isUsableLoop(loop)) return null;
  if (positionTicks < loop.endTicks) return null;
  return loop.startTicks;
}
