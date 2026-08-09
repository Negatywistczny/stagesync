/**
 * Ultimate Guitar wiki markup helpers (shared by paste + server fetch).
 * Strip [tab]/[ch], author notes, ASCII tab staff — keep blank lines for Forma splits.
 */

const UG_SECTION_START_RE =
  /\[(?:Intro|Verse|Chorus|Bridge|Outro|Pre-Chorus|Pre-chorus|Pre Chorus|Refrain|Coda|Solo|Hook|Zwrotka|Refren|Mostek|Wstęp|Zakończenie)/i;

/** Max chars for author-note / chrome line checks (ReDoS bound). */
const UG_NOTE_LINE_MAX = 512;

const UG_AUTHOR_NOTE_RE =
  /^(?:\([^)]{0,200}\)$|capo\s+\d|tuning:|key:|strumming:|no capo|fade out|submitting|tabs\.|ultimate guitar|http|you can (?:also )?play|play .{1,80} instead|throughout the (?:whole )?song)/i;

/** String names used in ASCII guitar/bass tab (high e … low E). */
const UG_TAB_STRING_RE = /^[eEBGDAa]\s*\|/;

/**
 * HTML named entities used in UG lyrics / data-content (XML/HTML4 basics + Latin-1).
 * No runtime dependency — shared must stay DOM/Node-free.
 */
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  nbsp: " ",
  iexcl: "¡",
  cent: "¢",
  pound: "£",
  curren: "¤",
  yen: "¥",
  brvbar: "¦",
  sect: "§",
  uml: "¨",
  copy: "©",
  ordf: "ª",
  laquo: "«",
  not: "¬",
  shy: "\u00AD",
  reg: "®",
  macr: "¯",
  deg: "°",
  plusmn: "±",
  sup2: "²",
  sup3: "³",
  acute: "´",
  micro: "µ",
  para: "¶",
  middot: "·",
  cedil: "¸",
  sup1: "¹",
  ordm: "º",
  raquo: "»",
  frac14: "¼",
  frac12: "½",
  frac34: "¾",
  iquest: "¿",
  Agrave: "À",
  Aacute: "Á",
  Acirc: "Â",
  Atilde: "Ã",
  Auml: "Ä",
  Aring: "Å",
  AElig: "Æ",
  Ccedil: "Ç",
  Egrave: "È",
  Eacute: "É",
  Ecirc: "Ê",
  Euml: "Ë",
  Igrave: "Ì",
  Iacute: "Í",
  Icirc: "Î",
  Iuml: "Ï",
  ETH: "Ð",
  Ntilde: "Ñ",
  Ograve: "Ò",
  Oacute: "Ó",
  Ocirc: "Ô",
  Otilde: "Õ",
  Ouml: "Ö",
  times: "×",
  Oslash: "Ø",
  Ugrave: "Ù",
  Uacute: "Ú",
  Ucirc: "Û",
  Uuml: "Ü",
  Yacute: "Ý",
  THORN: "Þ",
  szlig: "ß",
  agrave: "à",
  aacute: "á",
  acirc: "â",
  atilde: "ã",
  auml: "ä",
  aring: "å",
  aelig: "æ",
  ccedil: "ç",
  egrave: "è",
  eacute: "é",
  ecirc: "ê",
  euml: "ë",
  igrave: "ì",
  iacute: "í",
  icirc: "î",
  iuml: "ï",
  eth: "ð",
  ntilde: "ñ",
  ograve: "ò",
  oacute: "ó",
  ocirc: "ô",
  otilde: "õ",
  ouml: "ö",
  divide: "÷",
  oslash: "ø",
  ugrave: "ù",
  uacute: "ú",
  ucirc: "û",
  uuml: "ü",
  yacute: "ý",
  thorn: "þ",
  yuml: "ÿ",
};

function decodeHtmlEntitiesOnce(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === "#") {
      const hex = body[1] === "x" || body[1] === "X";
      const n = Number.parseInt(
        hex ? body.slice(2) : body.slice(1),
        hex ? 16 : 10,
      );
      if (Number.isFinite(n) && n > 0) {
        try {
          return String.fromCodePoint(n);
        } catch {
          return match;
        }
      }
      return match;
    }
    const named = NAMED_ENTITIES[body] ?? NAMED_ENTITIES[body.toLowerCase()];
    return named ?? match;
  });
}

/**
 * Decode common HTML entities (named + numeric) without an entities dependency.
 * Up to 3 passes so double-encoded forms like `&amp;oacute;` resolve.
 */
export function decodeHtmlEntities(text: string): string {
  let cur = String(text || "");
  for (let i = 0; i < 3; i++) {
    const next = decodeHtmlEntitiesOnce(cur);
    if (next === cur) break;
    cur = next;
  }
  return cur;
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
  let trimmed = String(line || "").trim();
  if (!trimmed) return false;
  if (trimmed.length > UG_NOTE_LINE_MAX) {
    trimmed = trimmed.slice(0, UG_NOTE_LINE_MAX);
  }
  if (UG_AUTHOR_NOTE_RE.test(trimmed)) return true;
  if (/^\[?.{1,120}\]?\s*=\s*x[0-9]+\s*$/i.test(trimmed)) return true;
  if (
    /^\([^)]{0,200}(?:feel free|measures|bassline|palm mute|shorten|counted)[^)]{0,200}\)$/i.test(
      trimmed,
    )
  ) {
    return true;
  }
  // Paired markdown emphasis: *note* / **note** / _note_
  if (/^(?:\*\*|__|\*|_)[^*_]{0,200}(?:\*\*|__|\*|_)$/.test(trimmed))
    return true;
  // UG tip / performance notes: "*you can play E7 instead of E..."
  if (/^\*+$/.test(trimmed) || /^\*[^*]/.test(trimmed)) return true;
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
