/**
 * mDNS / Bonjour advertisement for LAN discovery (desktop Launcher).
 * Service type: `_stagesync._tcp` — TXT: version, path=admin.
 */

import { Bonjour } from "bonjour-service";

export type MdnsAdvertiser = {
  stop: () => void;
};

function mdnsDisabled(): boolean {
  const raw = process.env.STAGESYNC_DISABLE_MDNS;
  return raw === "1" || raw === "true";
}

function isLoopbackOnlyBind(bindHost: string): boolean {
  return bindHost === "127.0.0.1" || bindHost === "localhost";
}

/**
 * Publish StageSync on the LAN when mDNS is enabled and the server is not
 * loopback-only. Returns a no-op stopper when advertising is skipped.
 */
export function startMdnsAdvertiser(opts: {
  port: number;
  bindHost: string;
  version: string;
  log?: (msg: string) => void;
}): MdnsAdvertiser {
  const log = opts.log ?? ((msg: string) => console.log(`[stagesync-server] ${msg}`));

  if (mdnsDisabled()) {
    log("mDNS advertise skipped (STAGESYNC_DISABLE_MDNS)");
    return { stop: () => undefined };
  }
  if (isLoopbackOnlyBind(opts.bindHost)) {
    log("mDNS advertise skipped (bind is loopback-only)");
    return { stop: () => undefined };
  }

  try {
    const bonjour = new Bonjour();
    const service = bonjour.publish({
      name: `StageSync ${opts.version}`,
      type: "stagesync",
      protocol: "tcp",
      port: opts.port,
      txt: {
        version: opts.version,
        path: "admin",
      },
    });
    log(`mDNS advertise _stagesync._tcp port=${opts.port}`);
    return {
      stop: () => {
        try {
          service.stop();
        } catch {
          /* ignore */
        }
        try {
          bonjour.destroy();
        } catch {
          /* ignore */
        }
      },
    };
  } catch (err) {
    log(`mDNS advertise failed: ${err instanceof Error ? err.message : String(err)}`);
    return { stop: () => undefined };
  }
}
