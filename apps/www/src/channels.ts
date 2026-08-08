export interface SiteChannels {
  product: string;
  repo: string;
  releases: string;
  latestReleaseApi: string;
  desktopUpdaterManifest: string;
  androidUpdaterManifest: string;
  containerImage: string;
  docs: {
    install: string;
    desktop: string;
    mobile: string;
    api: string;
    changelog: string;
  };
}

const FALLBACK: SiteChannels = {
  product: "StageSync",
  repo: "https://github.com/Negatywistczny/stagesync",
  releases: "https://github.com/Negatywistczny/stagesync/releases",
  latestReleaseApi:
    "https://api.github.com/repos/Negatywistczny/stagesync/releases/latest",
  desktopUpdaterManifest:
    "https://github.com/Negatywistczny/stagesync/releases/latest/download/latest.json",
  androidUpdaterManifest:
    "https://github.com/Negatywistczny/stagesync/releases/latest/download/android-latest.json",
  containerImage: "ghcr.io/negatywistczny/stagesync",
  docs: {
    install: "https://github.com/Negatywistczny/stagesync/blob/main/docs/guides/INSTALL.md",
    desktop: "https://github.com/Negatywistczny/stagesync/blob/main/docs/guides/DESKTOP.md",
    mobile: "https://github.com/Negatywistczny/stagesync/blob/main/docs/guides/MOBILE.md",
    api: "https://github.com/Negatywistczny/stagesync/blob/main/docs/api/README.md",
    changelog: "https://github.com/Negatywistczny/stagesync/blob/main/CHANGELOG.md",
  },
};

let cached: SiteChannels | null = null;

export async function loadChannels(): Promise<SiteChannels> {
  if (cached) return cached;
  try {
    const url = `${import.meta.env.BASE_URL}config/channels.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`channels HTTP ${res.status}`);
    cached = (await res.json()) as SiteChannels;
    return cached;
  } catch {
    cached = FALLBACK;
    return cached;
  }
}

export function channelsFallback(): SiteChannels {
  return FALLBACK;
}
