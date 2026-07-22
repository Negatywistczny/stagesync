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
      // Skip APIPA / link-local (mac Thunderbolt bridge noise).
      if (row.address.startsWith("169.254.")) continue;
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

export function buildNetworkInfo(port: number): {
  port: number;
  hostname: string;
  lanAddresses: string[];
  urls: string[];
} {
  const lan = getLanAddresses();
  const hostname = process.env.HOSTNAME || "localhost";
  const addresses = lan.map((r) => r.address).slice(0, 16);
  const urls = [
    `http://localhost:${port}`,
    ...addresses.map((a) => `http://${a}:${port}`),
  ];
  return {
    port,
    hostname,
    lanAddresses: addresses,
    urls,
  };
}
