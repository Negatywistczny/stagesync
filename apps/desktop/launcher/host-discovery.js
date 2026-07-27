/**
 * LAN host discovery display — keep in sync with packages/shared/src/host-discovery.ts
 */

const STAGESYNC_SERVICE_TITLE_RE = /^stagesync(\s|$)/i;
const DASH_SEMVER_RE = /^(\d+)-(\d+)-(\d+)(?:$|[-.])/;

export function normalizeDiscoveryVersion(raw) {
  if (raw == null) return null;
  let v = String(raw).trim().replace(/^v/i, "");
  if (!v) return null;
  const dash = DASH_SEMVER_RE.exec(v);
  if (dash) {
    v = `${dash[1]}.${dash[2]}.${dash[3]}`;
  }
  return v;
}

export function formatDiscoveryVersionLabel(raw) {
  const v = normalizeDiscoveryVersion(raw);
  return v ? `v${v}` : null;
}

function trimOrNull(value) {
  if (value == null) return null;
  const t = String(value).trim();
  return t || null;
}

function hostFromOrigin(origin) {
  if (!origin) return null;
  const trimmed = String(origin).trim();
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

function originDisplay(origin) {
  return hostFromOrigin(origin) ?? String(origin).replace(/^https?:\/\//i, "");
}

function isStagesyncServiceTitle(value) {
  return STAGESYNC_SERVICE_TITLE_RE.test(String(value).trim());
}

export function formatDiscoveryTitle(input) {
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

export function formatDiscoveryMeta(input) {
  const bits = [originDisplay(input.origin)];
  const versionLabel = formatDiscoveryVersionLabel(input.version);
  if (versionLabel) bits.push(versionLabel);
  const project = trimOrNull(input.project);
  if (project && project !== "Brak projektu") bits.push(project);
  return bits.join(" · ");
}
