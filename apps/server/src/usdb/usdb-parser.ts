import { decodeHtmlEntities } from "@stagesync/shared";
import type { UltrastarSongMetadata } from "@stagesync/shared";

export const USDB_ORIGIN = "https://usdb.animux.de";
export const SEARCH_LIMIT = 25;

export const USDB_URL_RE =
  /^https?:\/\/(?:www\.)?usdb\.animux\.de\/(?:index\.php)?(?:\?|#|$)/i;

export type UsdbCredentials = {
  user: string;
  pass: string;
};

export type UsdbSearchRow = {
  id: number;
  title: string | null;
  artist: string | null;
  language: string | null;
  edition: string | null;
  rating: number | null;
  url: string;
};

export type UsdbFetchResult = {
  content: string;
  metadata: UltrastarSongMetadata;
};

export function isValidUsdbSongUrl(url: string): boolean {
  return typeof url === "string" && USDB_URL_RE.test(url.trim());
}

export function extractUsdbSongId(urlOrId: string): number | null {
  const trimmed = String(urlOrId || "").trim();
  if (/^\d{1,8}$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }
  const match =
    trimmed.match(/[?&#]id=(\d+)/i) ||
    trimmed.match(/show_detail\((\d+)\)/i) ||
    trimmed.match(/\/(\d{1,8})(?:\/|$|\?)/);
  if (!match) return null;
  const id = Number.parseInt(match[1]!, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function usdbDetailUrl(id: number): string {
  return `${USDB_ORIGIN}/?link=detail&id=${id}`;
}

function stripTags(html: string): string {
  let cleaned = String(html || "");
  let prev: string;
  do {
    prev = cleaned;
    // \s* before closing > handles variants like </script > (space before >)
    cleaned = cleaned
      .replace(/<script[\s\S]*?<\/script\s*>/gi, "")
      .replace(/<style[\s\S]*?<\/style\s*>/gi, "");
  } while (cleaned !== prev);

  return decodeHtmlEntities(
    cleaned
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function countStars(cellHtml: string): number | null {
  const half = (cellHtml.match(/half_star\.png/gi) || []).length;
  // USDB uses star.png / half_star.png (older) and star2.png (current list).
  const star2 = (cellHtml.match(/star2\.png/gi) || []).length;
  // `half_star.png` also contains the substring `star.png` — subtract halves.
  const starLike = (cellHtml.match(/star\.png/gi) || []).length;
  const full = Math.max(0, starLike - half) + star2;
  if (!full && !half) return null;
  return full + half * 0.5;
}

function isBogusListLabel(text: string | null): boolean {
  if (!text) return true;
  const t = text.trim();
  if (!t) return true;
  if (/^artist$/i.test(t) || /^title$/i.test(t)) return true;
  // Unclosed <tr class="list_head"> can swallow the “There are N results…” blurb.
  if (/\bresults?\s+on\s+\d+\s+page/i.test(t)) return true;
  return false;
}

/**
 * Map list `<td>` cells → fields. Live USDB columns (2024+):
 * Artist, Title, Genre, Year, Edition, Golden, Language, Creator, Rating, Views.
 * Older / compact fixtures: Artist, Title, Edition, Golden, Language, …
 */
function metaFromListCells(cells: string[]): {
  artist: string | null;
  title: string | null;
  edition: string | null;
  language: string | null;
  rating: number | null;
} {
  const artist = stripTags(cells[0]!) || null;
  const title = stripTags(cells[1]!) || null;
  if (cells.length >= 10) {
    return {
      artist,
      title,
      edition: stripTags(cells[4]!) || null,
      language: stripTags(cells[6]!) || null,
      rating: countStars(
        cells.find((c) => /star2?\.png|half_star\.png/i.test(c)) ?? "",
      ),
    };
  }
  return {
    artist,
    title,
    edition: cells[2] ? stripTags(cells[2]) || null : null,
    language: cells.length >= 5 ? stripTags(cells[4]!) || null : null,
    rating: countStars(
      cells.find((c) => /star2?\.png|half_star\.png/i.test(c)) ?? "",
    ),
  };
}

/**
 * Parse USDB song list HTML (`?link=list`) into search rows.
 * Exported for unit tests (no network).
 *
 * USDB leaves `<tr class="list_head">` unclosed before data rows, so a naive
 * `<tr>…</tr>` regex merges the results blurb + header + first song. Prefer
 * `data-songid` rows (current markup).
 */
export function parseUsdbSearchHtml(html: string): UsdbSearchRow[] {
  const rows: UsdbSearchRow[] = [];
  const seen = new Set<number>();

  const pushFromInner = (id: number, rowInner: string) => {
    if (!Number.isFinite(id) || id <= 0 || seen.has(id)) return;
    const cells = [...rowInner.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(
      (m) => m[1] ?? "",
    );
    if (cells.length < 2) return;
    const meta = metaFromListCells(cells);
    if (isBogusListLabel(meta.artist) || isBogusListLabel(meta.title)) return;
    seen.add(id);
    rows.push({
      id,
      title: meta.title,
      artist: meta.artist,
      language: meta.language,
      edition: meta.edition,
      rating: meta.rating,
      url: usdbDetailUrl(id),
    });
  };

  for (const trMatch of html.matchAll(
    /<tr\b[^>]*\bdata-songid=["']?(\d+)["']?[^>]*>([\s\S]*?)<\/tr>/gi,
  )) {
    pushFromInner(Number.parseInt(trMatch[1]!, 10), trMatch[2] ?? "");
    if (rows.length >= SEARCH_LIMIT) return rows;
  }

  if (rows.length > 0) return rows;

  // Legacy fixtures without data-songid (closed header rows).
  for (const trMatch of html.matchAll(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi)) {
    const attrs = trMatch[1] ?? "";
    if (/list_head/i.test(attrs)) continue;
    const rowInner = trMatch[2] ?? "";
    const idMatch = rowInner.match(/show_detail\((\d+)\)/i);
    if (!idMatch) continue;
    pushFromInner(Number.parseInt(idMatch[1]!, 10), rowInner);
    if (rows.length >= SEARCH_LIMIT) break;
  }
  return rows;
}

/**
 * Extract UltraStar `.txt` body from USDB gettxt / editsongs HTML.
 */
export function parseUsdbTxtFromHtml(html: string): string | null {
  const match = html.match(/<textarea\b[^>]*>([\s\S]*?)<\/textarea>/i);
  if (!match) return null;
  const raw = decodeHtmlEntities(match[1] ?? "");
  // USDB may wrap with leading whitespace; keep UltraStar newlines.
  return raw
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .trim()
    ? raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n")
    : null;
}

export function parseUltrastarHeaders(content: string): {
  title: string | null;
  artist: string | null;
  language: string | null;
} {
  let title: string | null = null;
  let artist: string | null = null;
  let language: string | null = null;
  for (const line of content.split("\n")) {
    const m = line.match(/^#(TITLE|ARTIST|LANGUAGE)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1]!.toUpperCase();
    const value = m[2]!.trim() || null;
    if (key === "TITLE") title = value;
    else if (key === "ARTIST") artist = value;
    else if (key === "LANGUAGE") language = value;
  }
  return { title, artist, language };
}
