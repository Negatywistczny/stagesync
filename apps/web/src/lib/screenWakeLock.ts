/**
 * W3C Screen Wake Lock — PWA half of dual wake-lock (native APK uses FLAG_KEEP_SCREEN_ON).
 * Best-effort: unsupported browsers / denied permission → no-op.
 */
export async function requestScreenWakeLock(): Promise<WakeLockSentinel | null> {
  if (typeof navigator === "undefined") return null;
  const anyNav = navigator as Navigator & {
    wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> };
  };
  if (!anyNav.wakeLock?.request) return null;
  try {
    return await anyNav.wakeLock.request("screen");
  } catch {
    return null;
  }
}

export async function releaseScreenWakeLock(
  sentinel: WakeLockSentinel | null,
): Promise<void> {
  if (!sentinel) return;
  try {
    await sentinel.release();
  } catch {
    /* ignore */
  }
}
