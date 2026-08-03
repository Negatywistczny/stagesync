/**
 * Tekst block text join / word-boundary spaces for Client Karaoke & consumers.
 *
 * UltraStar marks word ends with trailing (or leading) spaces on syllables.
 * Blocks may store those spaces, or be trimmed with spaces only on `clip.text`.
 * Adjacent highlight spans must not glue words visually.
 */

/** Concatenate block texts as stored (preserves trailing / leading spaces). */
export function joinTekstBlockTexts(
  blocks: readonly { text: string }[],
): string {
  return blocks.map((b) => b.text).join("");
}

function blockHasEdgeWhitespace(text: string): boolean {
  return /^\s|\s$/.test(text);
}

/**
 * Ensure each block carries UltraStar-style trailing spaces at word ends.
 *
 * - If any block already has leading/trailing whitespace → leave as-is.
 * - If `join(blocks) === lineText` → leave as-is (spaces already consistent).
 * - Otherwise align trimmed syllable texts against `lineText` and pull following
 *   whitespace into that block. Mid-word syllables stay glued.
 *
 * Returns new block objects when text changes; otherwise a shallow copy array.
 */
export function withTekstBlockWordSpaces<T extends { text: string }>(
  lineText: string,
  blocks: readonly T[],
): T[] {
  if (blocks.length === 0) return [];
  if (blocks.some((b) => blockHasEdgeWhitespace(b.text))) {
    return blocks.map((b) => ({ ...b }));
  }

  const joined = joinTekstBlockTexts(blocks);
  if (joined === lineText || !/\s/.test(lineText)) {
    return blocks.map((b) => ({ ...b }));
  }

  const out: T[] = [];
  let pos = 0;
  for (const b of blocks) {
    const t = b.text;
    if (t.length === 0) {
      out.push({ ...b });
      continue;
    }
    const idx = lineText.indexOf(t, pos);
    if (idx < 0) {
      // Cannot align — keep original texts rather than invent separators.
      return blocks.map((x) => ({ ...x }));
    }
    let end = idx + t.length;
    while (end < lineText.length && /\s/.test(lineText[end]!)) {
      end += 1;
    }
    out.push({ ...b, text: lineText.slice(idx, end) });
    pos = end;
  }
  return out;
}
