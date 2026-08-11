/** Optional hook for mDNS TXT refresh after managed settings change (no restart). */

let refreshAdvertise: (() => void) | null = null;

export function registerMdnsRefresh(fn: () => void): void {
  refreshAdvertise = fn;
}

export function refreshMdnsAdvertise(): void {
  refreshAdvertise?.();
}

export function clearMdnsRefresh(): void {
  refreshAdvertise = null;
}
