import { networkInterfaces } from "node:os";

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

export function buildNetworkInfo(port: number): {
  port: number;
  hostname: string;
  lanAddresses: string[];
  urls: string[];
} {
  const lan = getLanAddresses();
  const hostname =
    (process.env.HOSTNAME ?? "localhost").trim().slice(0, 64) || "localhost";
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
