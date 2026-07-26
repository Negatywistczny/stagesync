/**
 * GitHub Releases `android-latest.json` — same channel as Desktop `latest.json`
 * and native `ReleaseApkUpdateChecker` (ADR 0015: explicit download only).
 */

export const ANDROID_LATEST_MANIFEST_URL =
  "https://github.com/Negatywistczny/stagesync/releases/latest/download/android-latest.json";

export type AndroidLatestManifest = {
  version: string;
  consoleUrl: string;
  performerUrl: string;
};

type ParsedSemver = {
  core: [number, number, number];
  pre: string[] | null;
};

function parseSemver(raw: string): ParsedSemver | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/i.exec(raw.trim());
  if (!m) return null;
  return {
    core: [Number(m[1]), Number(m[2]), Number(m[3])],
    pre: m[4] ? m[4].split(".") : null,
  };
}

function comparePreIds(a: string, b: string): number {
  const an = /^\d+$/.test(a) ? Number(a) : null;
  const bn = /^\d+$/.test(b) ? Number(b) : null;
  if (an != null && bn != null) return an - bn;
  if (an != null) return -1;
  if (bn != null) return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

/** True when `candidate` is a newer SemVer than `current`. */
export function isSemverNewer(candidate: string, current: string): boolean {
  const a = parseSemver(candidate);
  const b = parseSemver(current);
  if (!a || !b) return candidate !== current;
  for (let i = 0; i < 3; i++) {
    if (a.core[i]! !== b.core[i]!) return a.core[i]! > b.core[i]!;
  }
  if (a.pre == null && b.pre == null) return false;
  if (a.pre == null) return true;
  if (b.pre == null) return false;
  const n = Math.max(a.pre.length, b.pre.length);
  for (let i = 0; i < n; i++) {
    const left = a.pre[i];
    const right = b.pre[i];
    if (left == null) return false;
    if (right == null) return true;
    const c = comparePreIds(left, right);
    if (c !== 0) return c > 0;
  }
  return false;
}

export async function fetchAndroidLatestManifest(
  fetchImpl: typeof fetch = fetch,
): Promise<AndroidLatestManifest | null> {
  try {
    const res = await fetchImpl(ANDROID_LATEST_MANIFEST_URL, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<AndroidLatestManifest>;
    if (
      typeof data.version !== "string" ||
      typeof data.consoleUrl !== "string" ||
      typeof data.performerUrl !== "string"
    ) {
      return null;
    }
    return {
      version: data.version,
      consoleUrl: data.consoleUrl,
      performerUrl: data.performerUrl,
    };
  } catch {
    return null;
  }
}
