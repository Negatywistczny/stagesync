/**
 * UG / ChordPro pipe-bar grid — `| G | G B7 | Am | % |`.
 *
 * One cell between `|` = one bar. One chord → downbeat; two → half+half;
 * `%` repeats the previous cell’s rhythm/symbols; `N.C.` / `NC` = rest (gap).
 */

import { unwrapBracketSpans } from "../../ui-helpers/bracket-spans.js";
import { toLiteralStorage } from "../../music/chord-display.js";

const CHORD_TOKEN =
  /^[A-H](?:#|b)?(?:maj|min|m|sus|dim|aug|add|alt)?[0-9]*(?:sus[0-9]*)?(?:\/[24])?(?:(?:#|b)(?:5|9|11|13))*(?:\([^)]{0,32}\))?(?:\/[A-H](?:#|b)?)?$/i;

/** Reject pathological tokens before CHORD_TOKEN (ReDoS bound). */
const CHORD_TOKEN_MAX = 64;

const REST_TOKEN = /^(?:N\.?C\.?|NC|N\.C|—|-)$/i;

export type UgPipeChordEvent = {
  /** Bar index within the parsed block (0-based). */
  barIndex: number;
  /** 0 = downbeat; 0.5 = mid-bar (beat 3 in 4/4). */
  offsetInBar: number;
  symbol: string;
  /** Harmonic rest — importer may leave a gap until the next event. */
  isRest: boolean;
};

export type UgPipeBarsParse = {
  events: UgPipeChordEvent[];
  /** Number of `|…|` cells consumed (bars). */
  barCount: number;
};

function acceptChordToken(raw: string): string | null {
  const t = raw.trim();
  if (!t || t.length > CHORD_TOKEN_MAX || !CHORD_TOKEN.test(t)) return null;
  return toLiteralStorage(t);
}

function isRestToken(raw: string): boolean {
  return REST_TOKEN.test(raw.trim());
}

/** True when the line is a pipe-bar chord row (not a lyric with a stray `|`). */
export function isUgPipeBarLine(line: string): boolean {
  const t = line.trim();
  if (!t.includes("|")) return false;
  // Strip brackets for token checks: `| [G] | % |`
  const stripped = unwrapBracketSpans(t);
  const cells = stripped
    .split("|")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
  if (cells.length === 0) return false;
  return cells.every((cell) => {
    if (cell === "%") return true;
    const parts = cell.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return false;
    return parts.every(
      (p) =>
        isRestToken(p) || (p.length <= CHORD_TOKEN_MAX && CHORD_TOKEN.test(p)),
    );
  });
}

type PipeCell = {
  /** Symbols in cell order; empty + isRest = N.C. */
  symbols: string[];
  isRest: boolean;
};

function parsePipeCell(cellRaw: string): PipeCell | null {
  const cell = cellRaw.trim();
  if (!cell) return null;
  if (cell === "%") {
    return { symbols: [], isRest: false }; // marker — expand later
  }
  const parts = unwrapBracketSpans(cell).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.every(isRestToken)) {
    return { symbols: [], isRest: true };
  }
  const symbols: string[] = [];
  for (const p of parts) {
    if (isRestToken(p)) continue;
    const sym = acceptChordToken(p);
    if (sym) symbols.push(sym);
  }
  if (symbols.length === 0) return null;
  return { symbols, isRest: false };
}

function cellToOffsets(
  cell: PipeCell,
): { offsetInBar: number; symbol: string; isRest: boolean }[] {
  if (cell.isRest) {
    return [{ offsetInBar: 0, symbol: "N.C.", isRest: true }];
  }
  const n = cell.symbols.length;
  if (n <= 0) return [];
  if (n === 1) {
    return [{ offsetInBar: 0, symbol: cell.symbols[0]!, isRest: false }];
  }
  // 2 → half+half; 3+ → even fractions within the bar
  const out: { offsetInBar: number; symbol: string; isRest: boolean }[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      offsetInBar: i / n,
      symbol: cell.symbols[i]!,
      isRest: false,
    });
  }
  return out;
}

/**
 * Parse one pipe-bar line into cells (including `%` placeholders).
 */
export function parseUgPipeBarCells(
  line: string,
): Array<PipeCell | { repeat: true }> {
  const stripped = line.trim();
  const rawCells = stripped.split("|").map((c) => c.trim());
  // Leading/trailing empties from edge `|`
  const cells: Array<PipeCell | { repeat: true }> = [];
  for (const raw of rawCells) {
    if (!raw) continue;
    if (raw === "%") {
      cells.push({ repeat: true });
      continue;
    }
    const parsed = parsePipeCell(raw);
    if (parsed) cells.push(parsed);
  }
  return cells;
}

/**
 * Expand pipe-bar lines into absolute-within-block chord events + bar count.
 */
export function parseUgPipeBars(lines: readonly string[]): UgPipeBarsParse {
  const events: UgPipeChordEvent[] = [];
  let barIndex = 0;
  let prevOffsets: { offsetInBar: number; symbol: string; isRest: boolean }[] =
    [];

  for (const line of lines) {
    if (!isUgPipeBarLine(line)) continue;
    const cells = parseUgPipeBarCells(line);
    for (const cell of cells) {
      let offsets: { offsetInBar: number; symbol: string; isRest: boolean }[];
      if ("repeat" in cell) {
        offsets =
          prevOffsets.length > 0
            ? prevOffsets.map((o) => ({ ...o }))
            : [{ offsetInBar: 0, symbol: "N.C.", isRest: true }];
      } else {
        offsets = cellToOffsets(cell);
        prevOffsets = offsets.map((o) => ({ ...o }));
      }
      for (const o of offsets) {
        events.push({
          barIndex,
          offsetInBar: o.offsetInBar,
          symbol: o.symbol,
          isRest: o.isRest,
        });
      }
      barIndex += 1;
    }
  }

  return { events, barCount: barIndex };
}

/** Snap ticks to nearest barline (Beat 1 only). */
export function quantizeTicksToBar(ticks: number, barTicks: number): number {
  if (barTicks <= 0) return Math.round(ticks);
  if (ticks <= 0) return 0;
  const barStart = Math.floor(ticks / barTicks) * barTicks;
  const next = barStart + barTicks;
  return Math.abs(ticks - barStart) <= Math.abs(ticks - next) ? barStart : next;
}

/** Snap ticks to nearest barline or half-bar (beat 3 in 4/4). Pipe mid-cell OK. */
export function quantizeTicksToBarOrHalf(
  ticks: number,
  barTicks: number,
): number {
  if (barTicks <= 0) return Math.round(ticks);
  if (ticks <= 0) return 0;
  const barStart = Math.floor(ticks / barTicks) * barTicks;
  const half = barTicks / 2;
  const candidates = [barStart, barStart + half, barStart + barTicks];
  let best = candidates[0]!;
  let bestDist = Math.abs(ticks - best);
  for (let i = 1; i < candidates.length; i++) {
    const d = Math.abs(ticks - candidates[i]!);
    if (d < bestDist) {
      best = candidates[i]!;
      bestDist = d;
    }
  }
  return Math.round(best);
}

/**
 * Musical section start from first vocal tick: pickups (not near downbeat)
 * snap forward to the next barline; near-downbeat snaps back.
 */
export function sectionStartFromVocalTicks(
  firstWordTicks: number,
  barTicks: number,
): number {
  if (barTicks <= 0) return Math.max(0, Math.round(firstWordTicks));
  const t = Math.max(0, firstWordTicks);
  const rem = t % barTicks;
  if (rem === 0) return t;
  // Within first eighth of the bar → treat as late downbeat
  if (rem <= barTicks / 8) return t - rem;
  // Pickup / anacrusis → next barline
  return t - rem + barTicks;
}

export function ceilTicksToBar(ticks: number, barTicks: number): number {
  if (barTicks <= 0) return Math.round(ticks);
  if (ticks <= 0) return 0;
  const rem = ticks % barTicks;
  if (rem === 0) return ticks;
  return ticks - rem + barTicks;
}

export function floorTicksToBar(ticks: number, barTicks: number): number {
  if (barTicks <= 0) return Math.round(ticks);
  if (ticks <= 0) return 0;
  return ticks - (ticks % barTicks);
}
