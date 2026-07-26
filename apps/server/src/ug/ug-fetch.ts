/**
 * Fetch Ultimate Guitar chord tabs (server-side; CORS / Cloudflare).
 * Port of legacy `ug-fetch.js` — admin tool, not mass scraping.
 */

import { cleanUgTabContent, decodeHtmlEntities } from "@stagesync/shared";
import type { UgTabMetadata } from "@stagesync/shared";

const UG_TAB_URL_RE =
  /^https?:\/\/(?:tabs\.ultimate-guitar\.com|www\.ultimate-guitar\.com)\/tab\//i;

const FETCH_TIMEOUT_MS = 20_000;
const UG_CHORDS_CATEGORY = 300;
const UG_ORIGIN = "https://www.ultimate-guitar.com";

export function isValidUgTabUrl(url: string): boolean {
  return typeof url === "string" && UG_TAB_URL_RE.test(url.trim());
}

export function extractTabId(url: string): number | null {
  const match =
    String(url).match(/-chords-(\d+)/i) ||
    String(url).match(/-(\d+)(?:\?|$)/);
  return match ? Number.parseInt(match[1]!, 10) : null;
}

export function parseUgUrlSlug(
  url: string,
): { artist: string; song: string } | null {
  const match = String(url).match(/\/tab\/([^/]+)\/(.+)-chords-\d+/i);
  if (!match) return null;
  return {
    artist: match[1]!.replace(/-/g, " "),
    song: match[2]!.replace(/-/g, " "),
  };
}

export function extractDataContentJson(html: string): unknown {
  const classMatch = html.match(
    /<div[^>]*class="[^"]*js-store[^"]*"[^>]*data-content="([^"]*)"/i,
  );
  if (classMatch) {
    return JSON.parse(decodeHtmlEntities(classMatch[1]!));
  }

  const reverseMatch = html.match(
    /<div[^>]*data-content="([^"]*)"[^>]*class="[^"]*js-store[^"]*"/i,
  );
  if (reverseMatch) {
    return JSON.parse(decodeHtmlEntities(reverseMatch[1]!));
  }

  throw new Error(
    "Nie znaleziono danych zakładki (data-content). Strona UG mogła zmienić strukturę.",
  );
}

type UgPageData = {
  tab?: Record<string, unknown>;
  tab_view?: {
    meta?: Record<string, unknown>;
    wiki_tab?: { content?: unknown };
    type?: unknown;
    tonality?: unknown;
  };
};

export function getPageData(raw: unknown): UgPageData | null {
  if (!raw || typeof raw !== "object") return null;
  const store = (raw as { store?: { page?: { data?: unknown } } }).store;
  const data = store?.page?.data;
  if (!data || typeof data !== "object") return null;
  return data as UgPageData;
}

export function normalizeUgMetadata(
  pageData: UgPageData,
  url: string,
): UgTabMetadata {
  const tab = pageData?.tab ?? {};
  const meta = pageData?.tab_view?.meta ?? {};
  const tuningObj = meta.tuning;
  const tuning =
    typeof tuningObj === "string"
      ? tuningObj
      : tuningObj && typeof tuningObj === "object"
        ? String(
            (tuningObj as { value?: unknown; name?: unknown }).value ||
              (tuningObj as { name?: unknown }).name ||
              "",
          ) || null
        : null;

  const tonalityRaw =
    meta.tonality ??
    meta.tonality_name ??
    tab.tonality ??
    pageData?.tab_view?.tonality ??
    null;
  const tonality =
    tonalityRaw == null ? null : String(tonalityRaw).trim() || null;

  const tempoRaw = meta.tempo ?? meta.bpm ?? tab.tempo ?? null;
  const tempo = tempoRaw != null ? Number.parseInt(String(tempoRaw), 10) : null;

  const timeSignature =
    (typeof meta.time_signature === "string" && meta.time_signature) ||
    (typeof meta.signature === "string" && meta.signature) ||
    (typeof meta.meter === "string" && meta.meter) ||
    (typeof meta.time === "string" && meta.time) ||
    "4/4";

  const titleRaw = tab.song_name ?? tab.song_title ?? null;
  const artistRaw = tab.artist_name ?? tab.artist ?? null;
  const typeRaw = tab.type ?? pageData?.tab_view?.type ?? null;
  const tabIdRaw = tab.id;
  const tabId =
    typeof tabIdRaw === "number"
      ? tabIdRaw
      : typeof tabIdRaw === "string"
        ? Number.parseInt(tabIdRaw, 10)
        : extractTabId(url);

  return {
    title: titleRaw == null ? null : String(titleRaw).trim() || null,
    artist: artistRaw == null ? null : String(artistRaw).trim() || null,
    type: typeRaw == null ? null : String(typeRaw).trim() || null,
    tonality,
    timeSignature: String(timeSignature).trim() || "4/4",
    tempo: Number.isFinite(tempo) ? tempo : null,
    tuning: tuning && String(tuning).trim() ? String(tuning).trim() : null,
    tabId: Number.isFinite(tabId) ? (tabId as number) : null,
    url: typeof tab.tab_url === "string" && tab.tab_url ? tab.tab_url : url,
  };
}

export function getWikiTabContent(pageData: UgPageData): string {
  const content = pageData?.tab_view?.wiki_tab?.content;
  if (typeof content === "string" && content.trim()) return content;
  throw new Error("Brak treści zakładki (wiki_tab.content).");
}

export type UgFetchResult = {
  metadata: UgTabMetadata;
  /** Cleaned ChordPro-lite text ready for importUgText. */
  content: string;
};

export function buildFetchResult(
  pageData: UgPageData,
  url: string,
): UgFetchResult {
  const metadata = normalizeUgMetadata(pageData, url);
  const tabType = String(metadata.type || "").toLowerCase();
  if (tabType && tabType !== "chords" && !tabType.includes("chord")) {
    throw new Error(
      `Obsługiwane są tylko zakładki typu Chords (otrzymano: ${metadata.type}).`,
    );
  }
  const rawContent = getWikiTabContent(pageData);
  const content = cleanUgTabContent(rawContent);
  if (!content.trim()) {
    throw new Error("Zakładka UG nie zawiera tekstu / akordów do importu.");
  }
  return { metadata, content };
}

export function hasUgTabPayload(html: string): boolean {
  return /js-store/i.test(html) && /data-content=/i.test(html);
}

export function isCloudflareChallenge(html: string): boolean {
  return /just a moment|cf-browser-verification/i.test(html);
}

export function isUgNotFound(html: string, status: number): boolean {
  return status === 404 || /couldn't find that page|Oops!/i.test(html);
}

async function fetchUgHtml(
  url: string,
): Promise<{ status: number; html: string }> {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9,pl;q=0.8",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  return {
    status: response.status,
    html: await response.text(),
  };
}

type UgSearchHit = {
  id?: number | string;
  song_name?: string;
  artist_name?: string;
  type?: string;
  rating?: number;
  votes?: number;
  tab_url?: string;
  marketing_type?: unknown;
};

export type UgSearchRow = {
  id?: number | string;
  title: string | null;
  artist: string | null;
  type: string | null;
  rating: number | null;
  url: string | null;
};

/** Parse UG search `js-store` results (same shape as the former ultimate-guitar npm). */
export function parseUgSearchResults(
  raw: unknown,
  artist?: string,
): UgSearchHit[] {
  if (!raw || typeof raw !== "object") return [];
  const store = (raw as { store?: { page?: { data?: { results?: unknown } } } })
    .store;
  const results = store?.page?.data?.results;
  if (!Array.isArray(results)) return [];

  let value = results.filter(
    (per): per is UgSearchHit =>
      !!per &&
      typeof per === "object" &&
      String((per as UgSearchHit).type || "").toLowerCase() !== "pro" &&
      (per as UgSearchHit).marketing_type === undefined,
  );

  const artistQ = artist?.trim();
  if (artistQ) {
    const art = new RegExp(artistQ, "gi");
    value = value.filter(
      (per) => per.artist_name && art.test(String(per.artist_name)),
    );
  }

  return value;
}

function mapSearchHit(row: UgSearchHit): UgSearchRow {
  const id = row.id;
  const url =
    (typeof row.tab_url === "string" && row.tab_url) ||
    (id != null
      ? `https://tabs.ultimate-guitar.com/tab/_/${String(id)}`
      : null);
  return {
    id,
    title: row.song_name || null,
    artist: row.artist_name || null,
    type: row.type || null,
    rating: typeof row.rating === "number" ? row.rating : null,
    url,
  };
}

function rankSearchHits(hits: UgSearchHit[]): UgSearchHit[] {
  const chords = hits.filter((entry) => /chord/i.test(String(entry.type || "")));
  const pool = chords.length ? chords : hits;
  return [...pool].sort((a, b) => (b.votes || 0) - (a.votes || 0));
}

async function searchChordsTabUrl(
  title: string,
  artist: string,
): Promise<string | null> {
  const rows = await searchUgChords(title, artist);
  if (!rows.length) return null;
  return rows[0]?.url || null;
}

async function resolveUgTabUrl(url: string): Promise<{
  resolvedUrl: string;
  status: number;
  html: string;
}> {
  let resolvedUrl = String(url || "").trim();
  let { status, html } = await fetchUgHtml(resolvedUrl);

  if (!hasUgTabPayload(html) || isUgNotFound(html, status)) {
    const slug = parseUgUrlSlug(resolvedUrl);
    if (slug) {
      const altUrl = await searchChordsTabUrl(slug.song, slug.artist);
      if (altUrl && altUrl !== resolvedUrl) {
        resolvedUrl = altUrl;
        ({ status, html } = await fetchUgHtml(resolvedUrl));
      }
    }
  }

  return { resolvedUrl, status, html };
}

export async function fetchUgTab(url: string): Promise<UgFetchResult> {
  const trimmed = String(url || "").trim();
  if (!isValidUgTabUrl(trimmed)) {
    throw new Error(
      "Nieprawidłowy URL. Wymagany link do zakładki na ultimate-guitar.com/tab/...",
    );
  }

  let resolved: { resolvedUrl: string; status: number; html: string };
  try {
    resolved = await resolveUgTabUrl(trimmed);
  } catch (err) {
    const e = err as { name?: string; message?: string };
    if (e.name === "TimeoutError" || e.name === "AbortError") {
      throw new Error("Przekroczono limit czasu pobierania strony UG.");
    }
    throw new Error(`Błąd pobierania: ${e.message || String(err)}`);
  }

  const { resolvedUrl, status, html } = resolved;

  if (status === 403 || isCloudflareChallenge(html)) {
    throw new Error(
      "Ultimate Guitar zablokował żądanie. Spróbuj ponownie później.",
    );
  }

  if (!hasUgTabPayload(html)) {
    if (isUgNotFound(html, status)) {
      throw new Error(
        "Nie znaleziono zakładki UG pod tym linkiem. Sprawdź URL lub typ Chords.",
      );
    }
    throw new Error("Nie udało się odczytać danych zakładki ze strony UG.");
  }

  const raw = extractDataContentJson(html);
  const pageData = getPageData(raw);
  if (!pageData) {
    throw new Error("Nieprawidłowa struktura JSON ze strony UG.");
  }

  return buildFetchResult(pageData, resolvedUrl);
}

export async function searchUgChords(
  title: string,
  artist?: string,
): Promise<UgSearchRow[]> {
  const q = String(title || "").trim();
  if (!q) return [];

  const searchUrl = `${UG_ORIGIN}/search.php?title=${encodeURIComponent(q)}&type=${UG_CHORDS_CATEGORY}`;
  let html: string;
  try {
    ({ html } = await fetchUgHtml(searchUrl));
  } catch (err) {
    const e = err as { name?: string; message?: string };
    if (e.name === "TimeoutError" || e.name === "AbortError") {
      throw new Error("Przekroczono limit czasu wyszukiwania UG.");
    }
    throw new Error(`Błąd wyszukiwania UG: ${e.message || String(err)}`);
  }

  if (isCloudflareChallenge(html)) {
    throw new Error(
      "Ultimate Guitar zablokował żądanie. Spróbuj ponownie później.",
    );
  }

  if (!hasUgTabPayload(html)) {
    return [];
  }

  const raw = extractDataContentJson(html);
  const ranked = rankSearchHits(parseUgSearchResults(raw, artist));
  return ranked.slice(0, 25).map(mapSearchHit);
}
