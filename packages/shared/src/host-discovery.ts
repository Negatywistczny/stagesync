/**
 * LAN host discovery display — title + meta for launchers (mDNS TXT / health).
 * Keep Android HostDiscovery.kt in sync with these rules.
 */

const STAGESYNC_SERVICE_TITLE_RE = /^stagesync(\s|$)/i;
const DASH_SEMVER_RE = /^(\d+)-(\d+)-(\d+)(?:$|[-.])/;

export type FormatDiscoveryTitleInput = {
  hostname?: string | null;
  origin?: string | null;
  serviceName?: string | null;
};

export type FormatDiscoveryMetaInput = {
  origin: string;
  version?: string | null;
  project?: string | null;
};

/** Normalize version for UI meta — dots, optional v prefix stripped then re-added by caller. */
export function normalizeDiscoveryVersion(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null;
  let v = raw.trim().replace(/^v/i, "");
  if (!v) return null;
  const dash = DASH_SEMVER_RE.exec(v);
  if (dash) {
    v = `${dash[1]}.${dash[2]}.${dash[3]}`;
  }
  return v;
}

export function formatDiscoveryVersionLabel(
  raw: string | null | undefined,
): string | null {
  const v = normalizeDiscoveryVersion(raw);
  return v ? `v${v}` : null;
}

function trimOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const t = value.trim();
  return t || null;
}

function hostFromOrigin(origin: string | null | undefined): string | null {
  if (!origin) return null;
  const trimmed = origin.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `http://${trimmed}`,
    );
    const host = u.hostname;
    const port = u.port || (u.protocol === "https:" ? "443" : "80");
    if (!host) return null;
    if (
      (port === "80" && u.protocol === "http:") ||
      (port === "443" && u.protocol === "https:")
    ) {
      return host;
    }
    return `${host}:${port}`;
  } catch {
    return trimmed.replace(/^https?:\/\//i, "") || null;
  }
}

function originDisplay(origin: string): string {
  return hostFromOrigin(origin) ?? origin.replace(/^https?:\/\//i, "");
}

function isStagesyncServiceTitle(value: string): boolean {
  return STAGESYNC_SERVICE_TITLE_RE.test(value.trim());
}

/** Primary line on host list tiles. */
export function formatDiscoveryTitle(input: FormatDiscoveryTitleInput): string {
  const hostname = trimOrNull(input.hostname);
  if (hostname && !isStagesyncServiceTitle(hostname)) {
    return hostname;
  }

  const fromOrigin = hostFromOrigin(input.origin);
  if (fromOrigin) return fromOrigin;

  const serviceName = trimOrNull(input.serviceName);
  if (serviceName && !isStagesyncServiceTitle(serviceName)) {
    return serviceName;
  }

  return trimOrNull(input.origin) ?? "Host";
}

/** Secondary line: host:port · vX.Y.Z · project */
export function formatDiscoveryMeta(input: FormatDiscoveryMetaInput): string {
  const bits: string[] = [originDisplay(input.origin)];
  const versionLabel = formatDiscoveryVersionLabel(input.version);
  if (versionLabel) bits.push(versionLabel);
  const project = trimOrNull(input.project);
  if (project && project !== "Brak projektu") bits.push(project);
  return bits.join(" · ");
}
