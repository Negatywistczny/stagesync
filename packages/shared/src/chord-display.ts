/**
 * Chord storage + Client display contract (#478).
 *
 * Storage (`toLiteralStorage`): ASCII literal only (`Cmaj7`, `Am7(b5)`, …).
 * Display (`formatChordParts`): baseline = root pitch; quality in superscript.
 */

const REAL_BASS_RE = /^\/[A-GH][#b]?$/i;
const ROOT_PITCH_RE = /^([A-GH])([#b♯♭]{0,2})(.*)$/i;

export type ChordDisplayOptions = {
  /** true → keep maj/dim/m/aug words in superscript; false → Δ ° ø − + */
  literalQuality?: boolean;
  /** Polish hybrid: B→H, Bb stays Bb. */
  hybridPolishB?: boolean;
};

export type ChordNameParts = {
  /** Baseline root pitch only (e.g. C, F♯, B♭). */
  root: string;
  /** Entire superscript block (quality, symbols, digits, parens). */
  sup: string;
  /** Slash bass including leading `/` (e.g. `/A`), or empty. */
  bass: string;
  /** Screen-reader / aria: literal storage spelling with display accidentals. */
  plain: string;
};

function asciiAccidentals(text: string): string {
  return String(text ?? "")
    .replace(/♯/g, "#")
    .replace(/♭/g, "b");
}

/** Western pitch letter: Polish H → B (root / bass only). */
function westernPitchHead(part: string): string {
  const p = String(part ?? "");
  if (!p) return p;
  if (/^[Hh]/.test(p)) return `B${p.slice(1)}`;
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function splitRealBass(raw: string): { main: string; bass: string } {
  const slashIdx = raw.indexOf("/");
  if (slashIdx <= 0) return { main: raw, bass: "" };
  const maybeBass = raw.slice(slashIdx);
  // Real bass only — not 6/9 or sus2/4
  if (REAL_BASS_RE.test(maybeBass)) {
    return { main: raw.slice(0, slashIdx), bass: maybeBass };
  }
  // Mid-edit trailing slash (`C#m7/`) — drop incomplete bass, keep chord body
  if (maybeBass === "/") {
    return { main: raw.slice(0, slashIdx), bass: "" };
  }
  return { main: raw, bass: "" };
}

/**
 * Normalize quality suffix to ASCII literal storage (longest-match first).
 */
function normalizeQuality(quality: string): string {
  let q = asciiAccidentals(String(quality ?? ""));

  // Unicode quality glyphs → words
  q = q.replace(/ø7/g, "m7(b5)");
  q = q.replace(/ø/g, "m7(b5)");
  q = q.replace(/[Δ△](13|11|9|7)/g, "maj$1");
  q = q.replace(/[Δ△]/g, "maj7");
  q = q.replace(/°/g, "dim");

  // Typo + power-chord aliases
  q = q.replace(/ommit/gi, "omit");
  if (/^(\(omit3\)|\(no3\)|omit3|no3)$/i.test(q)) return "5";

  // Half-dim spellings
  q = q.replace(/m7b5/gi, "m7(b5)");

  // Sus compounds
  q = q.replace(/sus2sus4/gi, "sus2/4");

  if (/^alt$/i.test(q)) return "7alt";

  // Major family (longest first): M13/Maj7/… → majN; bare maj/M → triad (empty)
  q = q.replace(/(?:maj|Maj|MAJ)(13|11|9|7)/g, "maj$1");
  q = q.replace(/M(13|11|9|7)/g, "maj$1");
  if (/^(maj|Maj|MAJ|M)$/.test(q)) return "";

  // Minor: min / ASCII-or-minus → m
  q = q.replace(/^min/i, "m");
  if (q === "-" || q === "−") return "m";
  if (q.startsWith("-") || q.startsWith("−")) q = `m${q.slice(1)}`;

  // Bare sus numbers (Ab4 → Absus4)
  if (q === "2") return "sus2";
  if (q === "4") return "sus4";

  // Augmented: lone / leading +
  if (q === "+") return "aug";
  if (q.startsWith("+")) q = `aug${q.slice(1)}`;

  return q;
}

/**
 * Canonical ASCII storage form for an akord symbol (max 64, trim).
 * Western H→B on pitches; no ♯/♭/Δ/°/ø in the result.
 */
export function toLiteralStorage(input: string): string {
  const raw = asciiAccidentals(String(input ?? ""))
    .trim()
    .slice(0, 64);
  if (!raw || raw === "—" || /^[0-9]+$/.test(raw)) return raw;

  const { main, bass } = splitRealBass(raw);
  const match = main.match(ROOT_PITCH_RE);
  if (!match) {
    // Still canonicalize lone H pitches when possible
    return westernPitchHead(raw);
  }

  const letter = westernPitchHead(match[1] ?? "");
  const acc = asciiAccidentals(match[2] ?? "")
    .replace(/♯/g, "#")
    .replace(/♭/g, "b");
  const quality = normalizeQuality(match[3] ?? "");

  let out = `${letter}${acc}${quality}`;
  if (bass) {
    const bassBody = westernPitchHead(bass.slice(1));
    out += `/${bassBody}`;
  }
  return out.slice(0, 64);
}

/** Polish hybrid naming: B → H, but Bb stays Bb. */
export function formatHybridPolishB(text: string): string {
  return String(text ?? "").replace(
    /(^|\/)B(?!b)/g,
    (_, prefix: string) => `${prefix}H`,
  );
}

/** # / b on note letters and on extension numbers → ♯ / ♭. */
export function formatMusicalAccidentals(text: string): string {
  return String(text ?? "")
    .replace(/([A-G])([#b]+)/gi, (_, note: string, acc: string) => {
      const symbols = acc.replace(/#/g, "♯").replace(/b/g, "♭");
      return note.toUpperCase() + symbols;
    })
    .replace(/#(?=\d)/g, "♯")
    .replace(/b(?=\d)/g, "♭");
}

function decorateChordPart(part: string, options: ChordDisplayOptions): string {
  let out = String(part ?? "");
  if (options.hybridPolishB) out = formatHybridPolishB(out);
  return formatMusicalAccidentals(out);
}

/** Symbolic quality map (longest-match first). */
function qualityToSymbolic(quality: string): string {
  let q = quality;

  q = q.replace(/m7\(b5\)/gi, "ø7");
  // dim(maj7) before m(maj7) — otherwise m(maj7) eats the tail of dim(maj7)
  q = q.replace(/dim\(maj7\)/gi, "°Δ7");
  q = q.replace(/m\(maj7\)/gi, "mΔ");

  q = q.replace(/maj13/gi, "Δ13");
  q = q.replace(/maj11/gi, "Δ11");
  q = q.replace(/maj9/gi, "Δ9");
  q = q.replace(/maj7/gi, "Δ7");
  q = q.replace(/maj/gi, "Δ");
  // maj7(#11) → Δ7(#11) → Δ(#11)
  q = q.replace(/Δ7\(/g, "Δ(");

  q = q.replace(/dim7/gi, "°7");
  q = q.replace(/dim/gi, "°");
  q = q.replace(/aug/gi, "+");

  // Minor → minus (U+2212); keep mΔ from m(maj7)
  q = q.replace(/m(13|11|9|7|6)/gi, "−$1");
  q = q.replace(/m(?![a-zΔ△])/gi, "−");

  return q;
}

function parseRootQuality(main: string): { root: string; quality: string } {
  const match = main.match(/^([A-G])([#b]{0,2})(.*)$/i);
  if (!match) return { root: main, quality: "" };
  const root = `${(match[1] ?? "").toUpperCase()}${match[2] ?? ""}`;
  return { root, quality: match[3] ?? "" };
}

/**
 * Split normalized literal into display parts (root / superscript / bass).
 */
export function formatChordParts(
  chord: string,
  options: ChordDisplayOptions = {},
): ChordNameParts {
  const storage = toLiteralStorage(chord);
  if (!storage) {
    return { root: "", sup: "", bass: "", plain: "" };
  }
  if (storage === "—" || /^[0-9]+$/.test(storage)) {
    const token = decorateChordPart(storage, options);
    return { root: token, sup: "", bass: "", plain: token };
  }

  const { main, bass: bassRaw } = splitRealBass(storage);
  const { root: rootAscii, quality } = parseRootQuality(main);

  const supRaw = options.literalQuality ? quality : qualityToSymbolic(quality);

  const root = decorateChordPart(rootAscii, options);
  const sup = decorateChordPart(supRaw, options);
  const bass = bassRaw ? decorateChordPart(bassRaw, options) : "";

  // plain: literal storage spelling (not scenic Δ/°/ø), with display accidentals
  const plain = decorateChordPart(storage, options);

  return { root, sup, bass, plain };
}

/** Alias: parse → format parts. */
export function parseAndFormatParts(
  chord: string,
  options: ChordDisplayOptions = {},
): ChordNameParts {
  return formatChordParts(chord, options);
}

/** Alias: single-line scenic/literal join of parts. */
export function parseAndFormat(
  chord: string,
  options: ChordDisplayOptions = {},
): string {
  const { root, sup, bass } = formatChordParts(chord, options);
  return `${root}${sup}${bass}`;
}

/**
 * Resolve typed Client chord parts for rendering.
 * Normalizes via `toLiteralStorage` first (read-edge safety).
 */
export function resolveChordNameParts(
  chord: string,
  options: ChordDisplayOptions = {},
): ChordNameParts {
  return formatChordParts(chord, options);
}

/** @deprecated Prefer parseAndFormat / formatChordParts — thin scenic join. */
export function chordLiteralToSymbolDisplay(chord: string): string {
  return parseAndFormat(chord, { literalQuality: false });
}

/** @deprecated Prefer parseAndFormat. */
export function formatChordForDisplay(
  chord: string,
  options: ChordDisplayOptions = {},
): string {
  return parseAndFormat(chord, options);
}

/**
 * Split without prefs (legacy). Prefer formatChordParts.
 * Returns `root` (also mirrored as deprecated `base` for any stale callers).
 */
export function splitChordSuperscript(
  chord: string,
): Pick<ChordNameParts, "root" | "sup" | "bass"> & { base: string } {
  const parts = formatChordParts(chord, { literalQuality: true });
  return {
    root: parts.root,
    base: parts.root,
    sup: parts.sup,
    bass: parts.bass,
  };
}
