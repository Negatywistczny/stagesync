/**
 * Canonical token for alignment: lowercase, strip diacritics & punctuation.
 */
export function normalizeLyricToken(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** Split lyric text into alignable word tokens (empty norms dropped). */
export function tokenizeLyrics(text: string): { raw: string; norm: string }[] {
  return text
    .split(/\s+/)
    .map((w) => stripEdgeNonAlnum(w))
    .filter(Boolean)
    .map((raw) => ({ raw, norm: normalizeLyricToken(raw) }))
    .filter((t) => t.norm.length > 0);
}

/** Strip leading/trailing non-alnum (ASCII + Latin-1 supplement À–ž) without regex. */
function stripEdgeNonAlnum(w: string): string {
  let start = 0;
  let end = w.length;
  while (start < end && !isLyricEdgeChar(w.charCodeAt(start))) start += 1;
  while (end > start && !isLyricEdgeChar(w.charCodeAt(end - 1))) end -= 1;
  return w.slice(start, end);
}

function isLyricEdgeChar(code: number): boolean {
  return (
    (code >= 48 && code <= 57) || // 0-9
    (code >= 65 && code <= 90) || // A-Z
    (code >= 97 && code <= 122) || // a-z
    (code >= 0xc0 && code <= 0x17e) // À–ž
  );
}
