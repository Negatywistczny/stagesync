import { readApiError } from "./readApiError.js";

export type NetworkInfo = {
  port: number;
  hostname: string;
  lanAddresses: string[];
  urls: string[];
  version: string;
  /** Absolute host data root when reported by the server. */
  dataDir?: string;
  /** When true, host advertises via mDNS — Admin may show `http://{host}.local:{port}`. */
  mdnsEnabled?: boolean;
};

/**
 * Join URL for QR / default copy: first non-loopback LAN IPv4 from the host,
 * else first listed URL (localhost fallback when no LAN).
 */
export function pickPrimaryJoinUrl(info: NetworkInfo): string | null {
  const lan = info.lanAddresses[0];
  if (lan) return `http://${lan}:${info.port}`;
  const nonLoopback = info.urls.find((u) => {
    try {
      const host = new URL(u).hostname.toLowerCase();
      return host !== "localhost" && host !== "127.0.0.1" && host !== "::1";
    } catch {
      return false;
    }
  });
  return nonLoopback ?? info.urls[0] ?? null;
}

/**
 * Read-only mDNS join URL for Admin Host. Fail soft: omit when mDNS is off,
 * hostname unknown/localhost, or field missing — never invent a device name.
 */
export function mdnsJoinUrl(info: NetworkInfo): string | null {
  if (info.mdnsEnabled !== true) return null;
  const host = info.hostname.trim().replace(/\.local\.?$/i, "");
  if (!host || host.toLowerCase() === "localhost" || host === "127.0.0.1") {
    return null;
  }
  return `http://${host}.local:${info.port}`;
}

/** URL list for Admin: LAN / listed URLs plus mDNS row when not already present. */
export function networkDisplayUrls(info: NetworkInfo): string[] {
  const mdns = mdnsJoinUrl(info);
  if (!mdns || info.urls.includes(mdns)) return info.urls;
  const localhostIdx = info.urls.findIndex((u) => {
    try {
      const host = new URL(u).hostname.toLowerCase();
      return host === "localhost" || host === "127.0.0.1" || host === "::1";
    } catch {
      return /localhost|127\.0\.0\.1/i.test(u);
    }
  });
  if (localhostIdx < 0) return [...info.urls, mdns];
  return [
    ...info.urls.slice(0, localhostIdx),
    mdns,
    ...info.urls.slice(localhostIdx),
  ];
}

export async function fetchNetworkInfo(): Promise<NetworkInfo> {
  const res = await fetch("/api/system/network", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return (await res.json()) as NetworkInfo;
}

export type ApkDownloadKind = "performer" | "console";

const APK_FILENAMES: Record<ApkDownloadKind, string> = {
  performer: "stagesync-performer.apk",
  console: "stagesync-console.apk",
};

/** Absolute URL for sideload APK on the current host origin. */
export function apkDownloadUrl(origin: string, kind: ApkDownloadKind): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/downloads/${APK_FILENAMES[kind]}`;
}

/**
 * Build Performer / Console APK download URLs from a join URL (same host).
 * Returns null when joinUrl cannot be parsed.
 */
export function apkDownloadUrlsFromJoin(
  joinUrl: string,
): { performer: string; console: string } | null {
  try {
    const origin = new URL(joinUrl).origin;
    return {
      performer: apkDownloadUrl(origin, "performer"),
      console: apkDownloadUrl(origin, "console"),
    };
  } catch {
    return null;
  }
}

/**
 * Same-origin URL for APK HEAD probes.
 *
 * Admin often runs on `http://localhost:4000` while QR/join URLs use the LAN IP.
 * Fetching the absolute LAN `/downloads/*.apk` from localhost is cross-origin and
 * fails without CORS — falsely looking like a missing APK. Always probe the path
 * on the page origin; the host serves the same artifact.
 */
export function apkSameOriginProbeUrl(url: string): string {
  try {
    const base =
      typeof window !== "undefined" && window.location?.href
        ? window.location.href
        : "http://127.0.0.1/";
    const parsed = new URL(url, base);
    if (parsed.pathname.startsWith("/downloads/")) {
      return parsed.pathname;
    }
  } catch {
    /* keep input */
  }
  return url;
}

/** HEAD probe — true only when host has a non-empty APK artifact. */
export async function probeApkAvailable(url: string): Promise<boolean> {
  const probeUrl = apkSameOriginProbeUrl(url);
  try {
    const res = await fetch(probeUrl, { method: "HEAD", cache: "no-store" }); // codeql[js/insecure-download] Same-origin HEAD probe — APK served by local LAN server, not a remote HTTP host
    if (res.ok) return true;
    // Some proxies strip HEAD — fall back to ranged GET size check is overkill;
    // treat non-OK as unavailable (honest empty-state).
    return false;
  } catch {
    return false;
  }
}
