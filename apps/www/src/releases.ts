import { loadChannels, type SiteChannels } from "./channels.js";

export type DownloadKind =
  | "macos-arm"
  | "macos-x64"
  | "windows"
  | "android-console"
  | "android-performer";

export type DownloadCategory = "desktop" | "android";

export type PlatformIcon = "windows" | "apple" | "console" | "performer";

export interface DownloadOffer {
  kind: DownloadKind;
  category: DownloadCategory;
  icon: PlatformIcon;
  title: string;
  subtitle: string;
  detail: string;
  cta: string;
  url: string;
  helpLabel?: string;
  /** Opens in-page install guide on this tab (no external docs). */
  installTab?: "macos" | "windows" | "android";
}

interface GhAsset {
  name: string;
  browser_download_url: string;
}

interface GhRelease {
  tag_name: string;
  name: string | null;
  html_url: string;
  assets: GhAsset[];
}

const META: Record<DownloadKind, Omit<DownloadOffer, "kind" | "url" | "helpLabel" | "installTab">> = {
  windows: {
    category: "desktop",
    icon: "windows",
    title: "Windows",
    subtitle: "Aplikacja główna (stacja robocza)",
    detail: "Wersja 64-bit · instalator .msi",
    cta: "Pobierz dla Windows",
  },
  "macos-arm": {
    category: "desktop",
    icon: "apple",
    title: "macOS",
    subtitle: "Aplikacja główna (stacja robocza)",
    detail: "Dla Maców M1 / M2 / M3 / M4 · plik .dmg",
    cta: "Pobierz dla Mac",
  },
  "macos-x64": {
    category: "desktop",
    icon: "apple",
    title: "macOS",
    subtitle: "Aplikacja główna (stacja robocza)",
    detail: "Dla starszych Maców Intel · plik .dmg",
    cta: "Pobierz (Intel)",
  },
  "android-console": {
    category: "android",
    icon: "console",
    title: "Console",
    subtitle: "Realizator / Lider",
    detail: "Pełny panel zarządzania setlistą na telefonie lub tablecie",
    cta: "Pobierz Console (Android)",
  },
  "android-performer": {
    category: "android",
    icon: "performer",
    title: "Performer",
    subtitle: "Muzyk na scenie",
    detail: "Dedykowany widok nut, akordów i\u00A0tekstu na telefonie lub tablecie",
    cta: "Pobierz Performer (Android)",
  },
};

function classifyAsset(name: string): DownloadKind | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".dmg") && (lower.includes("aarch64") || lower.includes("arm64"))) {
    return "macos-arm";
  }
  if (lower.endsWith(".dmg") && (lower.includes("x64") || lower.includes("x86_64"))) {
    return "macos-x64";
  }
  if (lower.endsWith(".msi") && !lower.includes("_en-us")) {
    return "windows";
  }
  if (lower.includes("console") && lower.endsWith(".apk")) {
    return "android-console";
  }
  if (lower.includes("performer") && lower.endsWith(".apk")) {
    return "android-performer";
  }
  return null;
}

export interface DownloadCatalog {
  versionLabel: string;
  releaseUrl: string;
  channels: SiteChannels;
  desktop: {
    windows: DownloadOffer | null;
    macosArm: DownloadOffer | null;
    macosIntel: DownloadOffer | null;
  };
  android: {
    console: DownloadOffer | null;
    performer: DownloadOffer | null;
  };
}

function helpFor(kind: DownloadKind): Pick<DownloadOffer, "helpLabel" | "installTab"> {
  if (kind === "windows") {
    return { helpLabel: "Jak zainstalować na komputerze", installTab: "windows" };
  }
  if (kind === "macos-arm" || kind === "macos-x64") {
    return { helpLabel: "Jak zainstalować na komputerze", installTab: "macos" };
  }
  return { helpLabel: "Jak zainstalować na tablecie", installTab: "android" };
}

function toOffer(kind: DownloadKind, url: string): DownloadOffer {
  return { kind, url, ...META[kind], ...helpFor(kind) };
}

export function catalogFromRelease(release: GhRelease, channels: SiteChannels): DownloadCatalog {
  const byKind = new Map<DownloadKind, DownloadOffer>();
  for (const asset of release.assets) {
    const kind = classifyAsset(asset.name);
    if (!kind || byKind.has(kind)) continue;
    byKind.set(kind, toOffer(kind, asset.browser_download_url));
  }

  return {
    versionLabel: release.tag_name.replace(/^v/, ""),
    releaseUrl: release.html_url || channels.releases,
    channels,
    desktop: {
      windows: byKind.get("windows") ?? null,
      macosArm: byKind.get("macos-arm") ?? null,
      macosIntel: byKind.get("macos-x64") ?? null,
    },
    android: {
      console: byKind.get("android-console") ?? null,
      performer: byKind.get("android-performer") ?? null,
    },
  };
}

export function catalogHasAny(catalog: DownloadCatalog): boolean {
  return Boolean(
    catalog.desktop.windows ||
      catalog.desktop.macosArm ||
      catalog.desktop.macosIntel ||
      catalog.android.console ||
      catalog.android.performer,
  );
}

export async function fetchLatestCatalog(): Promise<DownloadCatalog> {
  const channels = await loadChannels();
  const res = await fetch(channels.latestReleaseApi, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) {
    throw new Error(`GitHub Releases HTTP ${res.status}`);
  }
  const release = (await res.json()) as GhRelease;
  return catalogFromRelease(release, channels);
}
