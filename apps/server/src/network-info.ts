import { hostname as osHostname, networkInterfaces } from "node:os";

export type LanAddress = {
  address: string;
  family: "IPv4" | "IPv6";
  internal: boolean;
  iface: string;
};

export function getLanAddresses(): LanAddress[] {
  const nets = networkInterfaces();
  const out: LanAddress[] = [];
  for (const [iface, list] of Object.entries(nets)) {
    if (!list) continue;
    for (const row of list) {
      if (row.internal) continue;
      const family = String(row.family) === "IPv6" ? "IPv6" : "IPv4";
      if (family !== "IPv4") continue;
      out.push({
        address: row.address,
        family,
        internal: row.internal,
        iface,
      });
    }
  }
  return out;
}

/** True when the join URL points at loopback (unusable for phone QR). */
export function isLoopbackJoinUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
  } catch {
    return /localhost|127\.0\.0\.1|\[?::1\]?/i.test(url);
  }
}

/**
 * Primary URL for QR / default copy: first non-loopback IPv4 join URL,
 * else first URL (localhost fallback when no LAN).
 */
export function pickPrimaryJoinUrl(urls: string[]): string | null {
  const lan = urls.find((u) => !isLoopbackJoinUrl(u));
  return lan ?? urls[0] ?? null;
}

/** Strip trailing `.local` and truncate for advertise / Admin display. */
export function normalizeAdvertiseHostname(raw: string): string {
  const host = raw.trim().replace(/\.local\.?$/i, "").slice(0, 64);
  return host || "localhost";
}

/**
 * Device hostname for Admin / mDNS row: `HOSTNAME` env, else OS hostname.
 * Never invents a fake brand name — may still be `localhost` on locked-down hosts.
 */
export function resolveAdvertiseHostname(): string {
  const fromEnv = (process.env.HOSTNAME ?? "").trim();
  if (fromEnv) return normalizeAdvertiseHostname(fromEnv);
  return normalizeAdvertiseHostname(osHostname());
}

/** `http://{host}.local:{port}` when hostname is a real device name; else null. */
export function buildMdnsJoinUrl(
  hostname: string,
  port: number,
): string | null {
  const host = normalizeAdvertiseHostname(hostname);
  if (!host || host.toLowerCase() === "localhost") return null;
  return `http://${host}.local:${port}`;
}

/**
 * Insert mDNS `.local` URL after LAN IPs and before localhost (when present).
 * No-op when `mdnsUrl` is null or already listed.
 */
export function withMdnsJoinUrl(urls: string[], mdnsUrl: string | null): string[] {
  if (!mdnsUrl || urls.includes(mdnsUrl)) return urls;
  const localhostIdx = urls.findIndex((u) => isLoopbackJoinUrl(u));
  if (localhostIdx < 0) return [...urls, mdnsUrl];
  return [
    ...urls.slice(0, localhostIdx),
    mdnsUrl,
    ...urls.slice(localhostIdx),
  ];
}

export function buildNetworkInfo(port: number): {
  port: number;
  hostname: string;
  lanAddresses: string[];
  urls: string[];
} {
  const lan = getLanAddresses();
  const hostname = resolveAdvertiseHostname();
  const addresses = lan.map((r) => r.address);
  // LAN first so QR / default selection is phone-reachable; localhost last for local copy.
  const urls = [
    ...addresses.map((a) => `http://${a}:${port}`),
    `http://localhost:${port}`,
  ];
  return {
    port,
    hostname,
    lanAddresses: addresses,
    urls,
  };
}
