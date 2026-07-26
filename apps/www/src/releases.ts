const REPO = "Negatywistczny/stagesync";
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases/latest`;
const RELEASES_PAGE = `https://github.com/${REPO}/releases`;

export type DownloadKind =
  | "macos-arm"
  | "macos-x64"
  | "windows"
  | "android-console"
  | "android-performer";

export interface DownloadOffer {
  kind: DownloadKind;
  label: string;
  hint: string;
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

const KIND_ORDER: DownloadKind[] = [
  "macos-arm",
  "macos-x64",
  "windows",
  "android-console",
  "android-performer",
];

const META: Record<DownloadKind, { label: string; hint: string }> = {
  "macos-arm": { label: "macOS (Apple Silicon)", hint: ".dmg · aarch64" },
  "macos-x64": { label: "macOS (Intel)", hint: ".dmg · x64" },
  windows: { label: "Windows", hint: ".msi · x64" },
  "android-console": { label: "Android Console", hint: ".apk" },
  "android-performer": { label: "Android Performer", hint: ".apk" },
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

export function offersFromRelease(release: GhRelease): {
  versionLabel: string;
  releaseUrl: string;
  offers: DownloadOffer[];
} {
  const byKind = new Map<DownloadKind, DownloadOffer>();
  for (const asset of release.assets) {
    const kind = classifyAsset(asset.name);
    if (!kind || byKind.has(kind)) continue;
    const meta = META[kind];
    byKind.set(kind, {
      kind,
      label: meta.label,
      hint: `${meta.hint} · ${asset.name}`,
      url: asset.browser_download_url,
    });
  }

  const offers = KIND_ORDER.flatMap((kind) => {
    const offer = byKind.get(kind);
    return offer ? [offer] : [];
  });

  const versionLabel = release.tag_name.replace(/^v/, "");
  return {
    versionLabel,
    releaseUrl: release.html_url || RELEASES_PAGE,
    offers,
  };
}

export async function fetchLatestOffers(): Promise<{
  versionLabel: string;
  releaseUrl: string;
  offers: DownloadOffer[];
}> {
  const res = await fetch(RELEASES_API, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) {
    throw new Error(`GitHub Releases HTTP ${res.status}`);
  }
  const release = (await res.json()) as GhRelease;
  return offersFromRelease(release);
}
