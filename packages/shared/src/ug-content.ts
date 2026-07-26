/**
 * Ultimate Guitar wiki markup helpers (shared by paste + server fetch).
 * Strip [tab]/[ch], author notes, ASCII tab staff — keep blank lines for Forma splits.
 */

const UG_SECTION_START_RE =
  /\[(?:Intro|Verse|Chorus|Bridge|Outro|Pre-Chorus|Pre-chorus|Pre Chorus|Refrain|Coda|Solo|Hook|Zwrotka|Refren|Mostek|Wstęp|Zakończenie)/i;

const UG_AUTHOR_NOTE_RE =
  /^(?:\(.*\)$|capo\s+\d|tuning:|key:|strumming:|no capo|fade out|submitting|tabs\.|ultimate guitar|http)/i;

/** String names used in ASCII guitar/bass tab (high e … low E). */
const UG_TAB_STRING_RE = /^[eEBGDAa]\s*\|/;

const BASIC_ENTITIES: Record<string, string> = {
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  nbsp: " ",
};

/** Decode common HTML entities (named + numeric) without an entities dependency. */
export function decodeHtmlEntities(text: string): string {
  return String(text || "").replace(
    /&(#x?[0-9a-f]+|[a-z]+);/gi,
    (match, body: string) => {
      if (body[0] === "#") {
        const hex = body[1] === "x" || body[1] === "X";
        const n = Number.parseInt(hex ? body.slice(2) : body.slice(1), hex ? 16 : 10);
        if (Number.isFinite(n) && n > 0) {
          try {
            return String.fromCodePoint(n);
          } catch {
            return match;
          }
        }
        return match;
      }
      const named = BASIC_ENTITIES[body.toLowerCase()];
      return named ?? match;
    },
  );
}

/** Convert UG wiki tags to ChordPro-lite brackets; keep newlines / blanks. */
export function normalizeUgWikiMarkup(raw: string): string {
  let text = decodeHtmlEntities(String(raw || ""));
  text = text.replace(/\[\/?tab\]/gi, "");
  text = text.replace(/\[ch\]([^[]*?)\[\/ch\]/gi, "[$1]");
  text = text.replace(/\r/g, "");
  return text;
}

export function isUgAuthorNoteLine(line: string): boolean {
  const trimmed = String(line || "").trim();
  if (!trimmed) return false;
  if (UG_AUTHOR_NOTE_RE.test(trimmed)) return true;
  if (/^\[?.+\]?\s*=\s*x[0-9]+\s*$/i.test(trimmed)) return true;
  if (
    /^\(.*(?:feel free|measures|bassline|palm mute|shorten|counted).*\)$/i.test(
      trimmed,
    )
  ) {
    return true;
  }
  if (/^(?:\*\*|__|\*|_).*(?:\*\*|__|\*|_)$/.test(trimmed)) return true;
  return false;
}

/**
 * ASCII guitar/bass tab staff lines (e|-8-8-|, B|----|, |------|------|).
 * Common in UG “Chords” tabs that also paste a tab intro — must not become vocal lines.
 */
export function isUgAsciiTabLine(line: string): boolean {
  const trimmed = String(line || "").trim();
  if (!trimmed || trimmed.length < 4) return false;

  if (UG_TAB_STRING_RE.test(trimmed)) {
    const after = trimmed.slice(trimmed.indexOf("|"));
    const tabChars = (after.match(/[-0-9xX]/g) || []).length;
    if (tabChars >= 3 && /^[|\-\d\sxXhHpPbBrR/\\~.]+$/.test(after)) return true;
  }

  if (/^\|/.test(trimmed)) {
    const dashes = (trimmed.match(/-/g) || []).length;
    if (dashes >= 6 && /^[|\-\d\sxX.\s]+$/.test(trimmed)) return true;
  }

  return false;
}

/**
 * Clean raw UG wiki_tab.content for importUgText / paste.
 * Keeps blank lines (v5 Forma splits); drops author notes and ASCII tab staff.
 */
export function cleanUgTabContent(raw: string): string {
  let text = normalizeUgWikiMarkup(raw);

  const sectionMatch = text.match(UG_SECTION_START_RE);
  if (sectionMatch && sectionMatch.index != null && sectionMatch.index > 0) {
    text = text.slice(sectionMatch.index);
  }

  text = text
    .split("\n")
    .filter((line) => !isUgAuthorNoteLine(line) && !isUgAsciiTabLine(line))
    .join("\n");

  return text.trim();
}
