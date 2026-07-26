const REPO = "Negatywistczny/stagesync";
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases/latest`;
const RELEASES_PAGE = `https://github.com/Negatywistczny/stagesync/releases`;

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

const META: Record<
  DownloadKind,
  Omit<DownloadOffer, "kind" | "url">
> = {
  windows: {
    category: "desktop",
    icon: "windows",
    title: "Windows",
    subtitle: "Stacja robocza",
    detail: "Wersja 64-bit · instalator .msi",
    cta: "Pobierz dla Windows",
  },
  "macos-arm": {
    category: "desktop",
    icon: "apple",
    title: "macOS",
    subtitle: "Apple Silicon",
    detail: "Architektura ARM64 (M1 / M2 / M3 / M4) · .dmg",
    cta: "Pobierz dla Mac",
  },
  "macos-x64": {
    category: "desktop",
    icon: "apple",
    title: "macOS",
    subtitle: "Intel",
    detail: "Wersja 64-bit (Intel) · .dmg",
    cta: "Pobierz (Intel)",
  },
  "android-console": {
    category: "android",
    icon: "console",
    title: "Console",
    subtitle: "Operator / FOH",
    detail: "Pełny panel reżyserii na tablecie Android",
    cta: "Pobierz Console",
  },
  "android-performer": {
    category: "android",
    icon: "performer",
    title: "Performer",
    subtitle: "Muzyk na scenie",
    detail: "Zsynchronizowany widok akordów, tekstu i partytury",
    cta: "Pobierz Performer",
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

function toOffer(kind: DownloadKind, url: string): DownloadOffer {
  return { kind, url, ...META[kind] };
}

export function catalogFromRelease(release: GhRelease): DownloadCatalog {
  const byKind = new Map<DownloadKind, DownloadOffer>();
  for (const asset of release.assets) {
    const kind = classifyAsset(asset.name);
    if (!kind || byKind.has(kind)) continue;
    byKind.set(kind, toOffer(kind, asset.browser_download_url));
  }

  return {
    versionLabel: release.tag_name.replace(/^v/, ""),
    releaseUrl: release.html_url || RELEASES_PAGE,
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
  const res = await fetch(RELEASES_API, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) {
    throw new Error(`GitHub Releases HTTP ${res.status}`);
  }
  const release = (await res.json()) as GhRelease;
  return catalogFromRelease(release);
}
