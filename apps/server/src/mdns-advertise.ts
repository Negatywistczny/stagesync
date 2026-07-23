/**
 * mDNS / Bonjour advertisement for LAN discovery (desktop Launcher).
 * Service type: `_stagesync._tcp` — TXT: hostname, version, project, status, path.
 */

import { hostname as osHostname } from "node:os";
import { Bonjour } from "bonjour-service";

export type MdnsTransportStatus = "PLAYING" | "PAUSED" | "STOPPED";

export type MdnsTxtMeta = {
  hostname: string;
  version: string;
  project: string;
  status: MdnsTransportStatus;
};

export type MdnsAdvertiser = {
  stop: () => void;
  /** Re-read getMeta and re-announce when TXT changed (debounced). */
  refresh: () => void;
};

const TXT_VALUE_MAX = 64;
const REFRESH_DEBOUNCE_MS = 400;
const NO_PROJECT = "Brak projektu";

function mdnsDisabled(): boolean {
  const raw = process.env.STAGESYNC_DISABLE_MDNS;
  return raw === "1" || raw === "true";
}

function isLoopbackOnlyBind(bindHost: string): boolean {
  return bindHost === "127.0.0.1" || bindHost === "localhost";
}

/** Truncate TXT values to keep DNS-SD packets small. */
export function truncateMdnsTxtValue(
  value: string,
  max = TXT_VALUE_MAX,
): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  if (max <= 1) return trimmed.slice(0, max);
  return `${trimmed.slice(0, max - 1)}…`;
}

export function normalizeMdnsHostname(raw: string): string {
  const host = raw.trim().replace(/\.local\.?$/i, "");
  return truncateMdnsTxtValue(host || "localhost");
}

export function buildMdnsTxt(
  meta: MdnsTxtMeta,
): Record<string, string> {
  return {
    hostname: normalizeMdnsHostname(meta.hostname),
    version: truncateMdnsTxtValue(meta.version, 32),
    project: truncateMdnsTxtValue(meta.project || NO_PROJECT),
    status: meta.status,
    path: "admin",
  };
}

function txtEqual(
  a: Record<string, string>,
  b: Record<string, string>,
): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

function defaultMeta(version: string): MdnsTxtMeta {
  return {
    hostname: osHostname(),
    version,
    project: NO_PROJECT,
    status: "STOPPED",
  };
}

/**
 * Publish StageSync on the LAN when mDNS is enabled and the server is not
 * loopback-only. Returns a no-op stopper when advertising is skipped.
 *
 * bonjour-service freezes the announce packet at publish time — TXT updates
 * require stop + re-publish (debounced via `refresh`).
 */
export function startMdnsAdvertiser(opts: {
  port: number;
  bindHost: string;
  version: string;
  getMeta?: () => MdnsTxtMeta | Promise<MdnsTxtMeta>;
  log?: (msg: string) => void;
}): MdnsAdvertiser {
  const log = opts.log ?? ((msg: string) => console.log(`[stagesync-server] ${msg}`));
  const noop: MdnsAdvertiser = {
    stop: () => undefined,
    refresh: () => undefined,
  };

  if (mdnsDisabled()) {
    log("mDNS advertise skipped (STAGESYNC_DISABLE_MDNS)");
    return noop;
  }
  if (isLoopbackOnlyBind(opts.bindHost)) {
    log("mDNS advertise skipped (bind is loopback-only)");
    return noop;
  }

  try {
    const bonjour = new Bonjour();
    let stopped = false;
    // bonjour-service types `Service.stop` as CallableFunction — keep opaque handle.
    let service: { stop: CallableFunction } | null = null;
    let currentTxt: Record<string, string> | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let refreshInFlight = false;
    let refreshQueued = false;

    const resolveMeta = async (): Promise<MdnsTxtMeta> => {
      if (!opts.getMeta) return defaultMeta(opts.version);
      try {
        return await opts.getMeta();
      } catch (err) {
        log(
          `mDNS getMeta failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        return defaultMeta(opts.version);
      }
    };

    const publishWithTxt = (txt: Record<string, string>) => {
      currentTxt = txt;
      service = bonjour.publish({
        name: `StageSync ${opts.version}`,
        type: "stagesync",
        protocol: "tcp",
        port: opts.port,
        txt,
      });
    };

    const stopService = () => {
      if (!service) return;
      try {
        service.stop();
      } catch {
        /* ignore */
      }
      service = null;
    };

    const applyMeta = async () => {
      if (stopped) return;
      const meta = await resolveMeta();
      if (stopped) return;
      const txt = buildMdnsTxt(meta);
      if (currentTxt && txtEqual(currentTxt, txt)) return;
      stopService();
      if (stopped) return;
      publishWithTxt(txt);
    };

    const runRefresh = async () => {
      if (stopped) return;
      if (refreshInFlight) {
        refreshQueued = true;
        return;
      }
      refreshInFlight = true;
      try {
        await applyMeta();
      } finally {
        refreshInFlight = false;
        if (refreshQueued && !stopped) {
          refreshQueued = false;
          void runRefresh();
        }
      }
    };

    const scheduleRefresh = () => {
      if (stopped) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        void runRefresh();
      }, REFRESH_DEBOUNCE_MS);
      debounceTimer.unref?.();
    };

    // Initial publish (sync defaults, then async refine if getMeta provided).
    publishWithTxt(buildMdnsTxt(defaultMeta(opts.version)));
    log(`mDNS advertise _stagesync._tcp port=${opts.port}`);
    if (opts.getMeta) {
      void runRefresh();
    }

    return {
      stop: () => {
        stopped = true;
        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }
        stopService();
        try {
          bonjour.destroy();
        } catch {
          /* ignore */
        }
      },
      refresh: scheduleRefresh,
    };
  } catch (err) {
    log(`mDNS advertise failed: ${err instanceof Error ? err.message : String(err)}`);
    return noop;
  }
}
