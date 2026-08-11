import { resolveMeterAt } from "../../project/project-resolve.js";
import type { FormaClip, Project } from "../../project/schema.js";
import { ticksPerBar } from "../../time-tempo/time.js";

export type WandMode = "tekst" | "akordy" | "both";

/** Forma section clip ids. Omit / empty = whole song (music sections only). */
export type WandScope = {
  sectionIds?: string[];
};

/**
 * Outcome of placing Tekst / Akordy from Forma (różdżka).
 *
 * - `ok: false` — nothing placed (empty Forma, no matching scope, or hard fail);
 *   `message` explains why for UI toast.
 * - `ok: true` — `project` is a new object; `placed` is the number of content clips
 *   written; `approximate` marks soft/heuristic layering (caller may warn).
 * Never throws for ordinary project shapes — fail-soft via `ok` + `message`.
 */
export type WandResult = {
  /** Updated project (same reference when `ok` is false and nothing changed). */
  project: Project;
  ok: boolean;
  /** Count of Tekst/Akordy clips written in this pass. */
  placed: number;
  /** Human-readable reason when `ok` is false (or soft warning when approximate). */
  message?: string;
  /** True when any section used approximate layer (B / F / C with B|F). */
  approximate?: boolean;
};

export type ContentLike = {
  id: string;
  startTicks: number;
  lengthTicks: number;
  text?: string;
  sourceSection?: string;
  sourceLineId?: string;
};

export const TEXT_WEIGHT_RATIO_THRESHOLD = 2;
export const TEXT_WEIGHT_SHORT_LAST_RATIO = 0.55;

export function musicSections(project: Project): FormaClip[] {
  return project.forma.clips
    .filter((c) => c.kind === "section")
    .slice()
    .sort((a, b) => a.startTicks - b.startTicks || a.id.localeCompare(b.id));
}

export function sectionFilter(scope: WandScope): Set<string> | null {
  const ids = scope.sectionIds?.filter((id) => id.length > 0);
  if (!ids?.length) return null;
  return new Set(ids);
}

export function sectionInFilter(
  filter: Set<string> | null,
  sectionId: string,
): boolean {
  if (!filter) return true;
  return filter.has(sectionId);
}

export function normalizeSectionNameKey(name: string): string {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function barTicksAt(project: Project, atTicks: number): number {
  return ticksPerBar(resolveMeterAt(project, atTicks), project.ppq);
}

export function beatTicksAt(project: Project, atTicks: number): number {
  const meter = resolveMeterAt(project, atTicks);
  const bar = ticksPerBar(meter, project.ppq);
  const beats = Math.max(1, meter.numerator);
  return Math.max(1, Math.floor(bar / beats));
}

/** Musical bars in span (v4: lengthBeats / quartersPerBar). */
export function barsInSpan(
  project: Project,
  startTicks: number,
  lengthTicks: number,
): number {
  const bar = barTicksAt(project, startTicks);
  return Math.max(0, lengthTicks / bar);
}

export function snapTicks(
  project: Project,
  ticks: number,
  atTicks: number,
): number {
  const beat = beatTicksAt(project, atTicks);
  return Math.round(ticks / beat) * beat;
}

export function textWeight(line: ContentLike): number {
  const t = String(line.text ?? "").trim();
  if (!t) return 1;
  const tokens = t.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) return Math.max(tokens.length, 1);
  return Math.max(t.length, 1);
}

export function shouldUseTextWeights(lines: ContentLike[]): boolean {
  if (lines.length < 2) return false;
  const weights = lines.map(textWeight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  if (minW > 0 && maxW / minW >= TEXT_WEIGHT_RATIO_THRESHOLD) return true;
  const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
  const last = weights[weights.length - 1]!;
  if (avg > 0 && last / avg <= TEXT_WEIGHT_SHORT_LAST_RATIO) return true;
  return false;
}

export function barDurationsABD(bars: number, n: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [bars];
  if (n > bars) {
    const step = bars / n;
    return Array.from({ length: n }, () => step);
  }
  if (bars % n === 0) {
    const step = bars / n;
    return Array.from({ length: n }, () => step);
  }
  const base = Math.floor(bars / n);
  const extra = bars % n;
  const durs = Array.from({ length: n }, () => base);
  for (let i = n - extra; i < n; i++) durs[i]! += 1;
  return durs;
}

export function barDurationsWeighted(
  bars: number,
  lines: ContentLike[],
): number[] {
  const weights = lines.map(textWeight);
  const total = weights.reduce((a, b) => a + b, 0) || lines.length;
  return weights.map((w) => (w / total) * bars);
}

export function onsetsFromBarDurations(
  project: Project,
  spanStart: number,
  durs: number[],
): number[] {
  const bar = barTicksAt(project, spanStart);
  const onsets: number[] = [];
  let cursor = spanStart;
  for (const dur of durs) {
    onsets.push(snapTicks(project, cursor, spanStart));
    cursor += dur * bar;
  }
  return onsets;
}

export function subsectionSpans(
  sec: FormaClip,
): { startTicks: number; lengthTicks: number }[] {
  const secStart = sec.startTicks;
  const secEnd = sec.startTicks + sec.lengthTicks;
  const raw = Array.isArray(sec.subsections) ? sec.subsections : [];
  const starts = [
    secStart,
    ...raw
      .map((off) => secStart + off)
      .filter((t) => t > secStart && t < secEnd),
  ];
  const uniq = [...new Set(starts)].sort((a, b) => a - b);
  if (!uniq.length || uniq[0] !== secStart) uniq.unshift(secStart);
  const spans: { startTicks: number; lengthTicks: number }[] = [];
  for (let i = 0; i < uniq.length; i++) {
    const start = uniq[i]!;
    const end = i + 1 < uniq.length ? uniq[i + 1]! : secEnd;
    const lengthTicks = Math.max(0, end - start);
    if (lengthTicks < 1) continue;
    spans.push({ startTicks: start, lengthTicks });
  }
  return spans;
}

export function detectContentGapSpans(
  project: Project,
  sec: FormaClip,
): { startTicks: number; lengthTicks: number; bars: number }[] | null {
  const spans = subsectionSpans(sec);
  if (spans.length < 2) return null;
  const oneBar = barTicksAt(project, sec.startTicks);
  const classified = spans.map((sp) => {
    const bars = barsInSpan(project, sp.startTicks, sp.lengthTicks);
    const isGap = sp.lengthTicks <= oneBar + 1 && bars <= 1 + 1e-6;
    return {
      startTicks: sp.startTicks,
      lengthTicks: sp.lengthTicks,
      bars,
      kind: isGap ? ("gap" as const) : ("content" as const),
    };
  });
  const content = classified.filter((s) => s.kind === "content");
  const gaps = classified.filter((s) => s.kind === "gap");
  if (!content.length || !gaps.length) return null;
  let alternating = true;
  for (let i = 0; i < classified.length - 1; i++) {
    if (classified[i]!.kind === "gap" && classified[i + 1]!.kind === "gap") {
      alternating = false;
      break;
    }
  }
  if (!alternating && content.length < 2) return null;
  return content.map((c) => ({
    startTicks: c.startTicks,
    lengthTicks: c.lengthTicks,
    bars: c.bars,
  }));
}

export function splitCountsByContentBars(
  n: number,
  contentSpans: { bars: number }[],
): number[] {
  if (n <= 0 || !contentSpans.length) return [];
  const totalBars = contentSpans.reduce((a, s) => a + s.bars, 0);
  if (totalBars <= 0) {
    return contentSpans.map((_, i) => (i === 0 ? n : 0));
  }
  const raw = contentSpans.map((s) => (s.bars / totalBars) * n);
  const floors = raw.map((x) => Math.floor(x));
  const assigned = floors.reduce((a, b) => a + b, 0);
  const frac = raw
    .map((x, i) => ({ i, f: x - floors[i]! }))
    .sort((a, b) => b.f - a.f);
  const counts = [...floors];
  let rem = n - assigned;
  let fi = 0;
  while (rem > 0 && frac.length) {
    counts[frac[fi % frac.length]!.i]! += 1;
    rem -= 1;
    fi += 1;
  }
  if (n >= contentSpans.length && counts.some((c) => c === 0)) {
    const zeros = counts
      .map((c, i) => (c === 0 ? i : -1))
      .filter((i) => i >= 0);
    for (const zi of zeros) {
      const donor = counts
        .map((c, i) => ({ i, c }))
        .filter((x) => x.c > 1)
        .sort((a, b) => b.c - a.c)[0];
      if (!donor) break;
      counts[donor.i]! -= 1;
      counts[zi]! += 1;
    }
  }
  return counts;
}

export function containingSection(
  sections: FormaClip[],
  startTicks: number,
  project: Project,
): FormaClip | null {
  for (let i = 0; i < sections.length; i++) {
    const clip = sections[i]!;
    const next = sections[i + 1];
    const end = next ? next.startTicks : clip.startTicks + clip.lengthTicks;
    if (startTicks >= clip.startTicks && startTicks < end) {
      if (next) {
        const bar = barTicksAt(project, next.startTicks);
        if (
          startTicks < next.startTicks &&
          startTicks >= next.startTicks - bar
        ) {
          return next;
        }
      }
      return clip;
    }
  }
  if (sections.length > 0) {
    const last = sections[sections.length - 1]!;
    if (startTicks >= last.startTicks) return last;
  }
  return null;
}

export type PlaceChunkResult = {
  placed: number;
  approximate: boolean;
  layer: string | null;
};

export type PlaceSectionResult = {
  placed: number;
  approximate: boolean;
  layer: string | null;
};
