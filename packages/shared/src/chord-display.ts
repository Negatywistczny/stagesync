/**
 * Chord display formatting — port of legacy chord-display.js (Client grid prefs).
 */

/** Literowy zapis → symbole: maj→Δ, m7b5→ø7, dim→°, aug→+. */
export function chordLiteralToSymbolDisplay(chord: string): string {
  const raw = String(chord ?? "").trim().slice(0, 64);
  if (!raw || raw === "—" || /^[0-9]+$/.test(raw)) return raw;

  const slash = raw.indexOf("/");
  const head = slash >= 0 ? raw.slice(0, slash) : raw;
  const bass = slash >= 0 ? raw.slice(slash) : "";
  const match = head.match(/^([A-G][#b]?)(.*)$/i);
  if (!match) return raw;

  let quality = match[2] ?? "";
  quality = quality.replace(/aug/gi, "+");
  quality = quality.replace(/m7b5/gi, "ø7");
  quality = quality.replace(/maj/gi, "Δ");
  quality = quality.replace(/dim/gi, "°");

  return (match[1] ?? "") + quality + bass;
}

export type ChordDisplayOptions = {
  /** true → keep maj/dim/… from file; false → symbols (Δ ° ø +). */
  literalQuality?: boolean;
  /** Polish hybrid: B→H, Bb stays Bb. */
  hybridPolishB?: boolean;
};

export function formatChordForDisplay(
  chord: string,
  options: ChordDisplayOptions = {},
): string {
  const raw = String(chord ?? "").trim();
  if (!raw) return raw;
  let out = options.literalQuality
    ? raw
    : chordLiteralToSymbolDisplay(raw);
  if (options.hybridPolishB) {
    out = formatHybridPolishB(out);
  }
  return out;
}

/** Polskie hybrydowe nazewnictwo: B → H, ale Bb zostaje Bb. */
export function formatHybridPolishB(text: string): string {
  return String(text ?? "").replace(/(^|\/)B(?!b)/gi, (_, prefix: string) =>
    `${prefix}H`,
  );
}
