/**
 * Ultimate Guitar / ChordPro-lite import — section header / blank-line split.
 */

import {
  CHORD_TOKEN_MAX,
  extractBracketChords,
  isChordToken,
} from "./chords.js";
import type { SplitUgSectionsOptions } from "./types.js";

const SECTION_BRACKET =
  /^\[(Verse|Chorus|Bridge|Intro|Outro|Pre-?Chorus|Solo|Instrumental|Interlude|Tag|Ending|Hook|Refrain|Coda|Break|Prechorus)(?:\s*\d*)?\]$/i;

type RawSection = { name: string | null; lines: string[] };

function parseSectionHeader(line: string): string | null {
  const bracket = line.match(SECTION_BRACKET);
  if (bracket?.[1]) {
    return bracket[1].replace(/prechorus/i, "Pre-Chorus");
  }
  if (
    line.startsWith("[") &&
    line.endsWith("]") &&
    line.indexOf("]") === line.length - 1 &&
    !extractBracketChords(line).length
  ) {
    const inner = line.slice(1, -1).trim();
    if (inner && (inner.length > CHORD_TOKEN_MAX || !isChordToken(inner))) {
      return inner.slice(0, 120);
    }
  }
  // ChordPro `{comment:…}` / `{c:…}` / `{start_of_*:…}` — indexOf parse (no ReDoS).
  if (line.startsWith("{") && line.endsWith("}")) {
    const body = line.slice(1, -1);
    const colon = body.indexOf(":");
    const keyRaw = (colon >= 0 ? body.slice(0, colon) : body).trim();
    const key = keyRaw.toLowerCase();
    const value = colon >= 0 ? body.slice(colon + 1).trim() : "";
    if (key === "comment" || key === "c") {
      if (value) return value.slice(0, 120);
    } else if (key.startsWith("start_of_")) {
      const kind = key.slice("start_of_".length).replace(/_/g, " ");
      const title = value || kind.replace(/\b\w/g, (c) => c.toUpperCase());
      return title.slice(0, 120);
    }
  }
  return null;
}

function isSkipMetaDirective(line: string): boolean {
  if (!(line.startsWith("{") && line.endsWith("}"))) return false;
  if (parseSectionHeader(line)) return false;
  return true;
}

export function splitUgSections(
  raw: string,
  options: SplitUgSectionsOptions = {},
): RawSection[] {
  const splitOnBlank = options.splitOnBlankLines !== false;
  const out: RawSection[] = [];
  let current: RawSection = { name: null, lines: [] };

  const flush = () => {
    if (current.lines.length > 0 || current.name) {
      out.push(current);
    }
    current = { name: null, lines: [] };
  };

  for (const lineRaw of raw.split("\n")) {
    const line = lineRaw.trim();
    if (!line) {
      if (splitOnBlank && (current.lines.length > 0 || current.name)) flush();
      continue;
    }
    if (isSkipMetaDirective(line)) continue;
    const header = parseSectionHeader(line);
    if (header) {
      if (current.lines.length > 0 || current.name) flush();
      current = { name: header, lines: [] };
      continue;
    }
    // Keep leading indent — UG chord-above columns (Chorus „    G”) are musical.
    current.lines.push(lineRaw.trimEnd());
  }
  flush();
  return out.filter((s) => s.lines.length > 0);
}

export function defaultSectionName(index: number, named: string | null): string {
  const n = named?.trim();
  if (n) return n.slice(0, 120);
  return `Sekcja ${index + 1}`;
}
