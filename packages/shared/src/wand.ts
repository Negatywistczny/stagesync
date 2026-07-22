/**
 * Różdżka — place Tekst / Akordy onto existing Forma sections (v4 parity).
 * Pure; Forma clips are never mutated. Countdown / digit clips stay put.
 *
 * Port of legacy `placeVocalsFromForma` (A–F) + `placeChordsFromForma` (A–E + L).
 */

import { isCountdownDigitClipId } from "./countdown-content.js";
import { resolveMeterAt } from "./project-resolve.js";
import { projectEndTicks } from "./project-bounds.js";
import type { AkordClip, FormaClip, Project, TekstClip } from "./schema.js";
import { ticksPerBar } from "./time.js";
import { sealAkordyLengths } from "./ug-import.js";

export type WandMode = "tekst" | "akordy" | "both";

/** Forma section clip ids. Omit / empty = whole song (music sections only). */
export type WandScope = {
  sectionIds?: string[];
};

export type WandResult = {
  project: Project;
  ok: boolean;
  placed: number;
  message?: string;
  /** True when any section used approximate layer (B / F / C with B|F). */
  approximate?: boolean;
};

type ContentLike = {
  id: string;
  startTicks: number;
  lengthTicks: number;
  text?: string;
  sourceSection?: string;
  sourceLineId?: string;
};

const TEXT_WEIGHT_RATIO_THRESHOLD = 2;
const TEXT_WEIGHT_SHORT_LAST_RATIO = 0.55;

function musicSections(project: Project): FormaClip[] {
  return project.forma.clips
    .filter((c) => c.kind === "section")
    .slice()
    .sort(
      (a, b) =>
        a.startTicks - b.startTicks || a.id.localeCompare(b.id),
    );
}

function sectionFilter(scope: WandScope): Set<string> | null {
  const ids = scope.sectionIds?.filter((id) => id.length > 0);
  if (!ids?.length) return null;
  return new Set(ids);
}

function sectionInFilter(
  filter: Set<string> | null,
  sectionId: string,
): boolean {
  if (!filter) return true;
  return filter.has(sectionId);
}

function normalizeSectionNameKey(name: string): string {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function barTicksAt(project: Project, atTicks: number): number {
  return ticksPerBar(resolveMeterAt(project, atTicks), project.ppq);
}

function beatTicksAt(project: Project, atTicks: number): number {
  const meter = resolveMeterAt(project, atTicks);
  const bar = ticksPerBar(meter, project.ppq);
  const beats = Math.max(1, meter.numerator);
  return Math.max(1, Math.floor(bar / beats));
}

/** Musical bars in span (v4: lengthBeats / quartersPerBar). */
function barsInSpan(
  project: Project,
  startTicks: number,
  lengthTicks: number,
): number {
  const bar = barTicksAt(project, startTicks);
  return Math.max(0, lengthTicks / bar);
}

function snapTicks(project: Project, ticks: number, atTicks: number): number {
  const beat = beatTicksAt(project, atTicks);
  return Math.round(ticks / beat) * beat;
}

function textWeight(line: ContentLike): number {
  const t = String(line.text ?? "").trim();
  if (!t) return 1;
  const tokens = t.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) return Math.max(tokens.length, 1);
  return Math.max(t.length, 1);
}

function shouldUseTextWeights(lines: ContentLike[]): boolean {
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

function barDurationsABD(bars: number, n: number): number[] {
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

function barDurationsWeighted(bars: number, lines: ContentLike[]): number[] {
  const weights = lines.map(textWeight);
  const total = weights.reduce((a, b) => a + b, 0) || lines.length;
  return weights.map((w) => (w / total) * bars);
}

/** Tekst layers A–F (v4 `pickLayerAndDurations`). */
function pickLayerAndDurations(
  bars: number,
  lines: ContentLike[],
  opts: { forceWeights?: boolean } = {},
): { layer: string; durs: number[]; approximate: boolean } {
  const n = lines.length;
  if (n === 1) return { layer: "E", durs: [bars], approximate: false };
  if (n > bars) {
    return { layer: "D", durs: barDurationsABD(bars, n), approximate: false };
  }
  // Even whole-bar split wins over text weights — F must not break A
  if (bars % n === 0 && !opts.forceWeights) {
    return { layer: "A", durs: barDurationsABD(bars, n), approximate: false };
  }
  // F only when the floor is ≤1 bar/line
  const base = Math.floor(bars / n);
  if (opts.forceWeights || (base <= 1 && shouldUseTextWeights(lines))) {
    return {
      layer: "F",
      durs: barDurationsWeighted(bars, lines),
      approximate: true,
    };
  }
  return { layer: "B", durs: barDurationsABD(bars, n), approximate: true };
}

/** Akordy layers E → D → A → B (no F). */
function pickChordLayerAndDurations(
  bars: number,
  n: number,
): { layer: string; durs: number[]; approximate: boolean } {
  if (n === 1) return { layer: "E", durs: [bars], approximate: false };
  if (n > bars) {
    return { layer: "D", durs: barDurationsABD(bars, n), approximate: false };
  }
  if (bars % n === 0) {
    return { layer: "A", durs: barDurationsABD(bars, n), approximate: false };
  }
  return { layer: "B", durs: barDurationsABD(bars, n), approximate: true };
}

function onsetsFromBarDurations(
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

function placeInSpan(
  project: Project,
  lines: ContentLike[],
  spanStart: number,
  spanLengthTicks: number,
  kind: "tekst" | "akordy",
): { layer: string | null; approximate: boolean; onsets: number[] } {
  if (!lines.length) return { layer: null, approximate: false, onsets: [] };
  const bars = barsInSpan(project, spanStart, spanLengthTicks);
  const picked =
    kind === "tekst"
      ? pickLayerAndDurations(bars, lines)
      : pickChordLayerAndDurations(bars, lines.length);
  const { layer, durs, approximate } = picked;
  const onsets = onsetsFromBarDurations(project, spanStart, durs);
  const spanEnd = spanStart + spanLengthTicks;
  const minDur = beatTicksAt(project, spanStart);
  for (let i = 0; i < onsets.length; i++) {
    const maxStart = spanEnd - minDur;
    if (onsets[i]! > maxStart) {
      onsets[i] = snapTicks(
        project,
        Math.max(spanStart, maxStart),
        spanStart,
      );
    }
    if (i > 0 && onsets[i]! < onsets[i - 1]!) {
      onsets[i] = snapTicks(
        project,
        Math.min(spanEnd, onsets[i - 1]! + minDur),
        spanStart,
      );
    }
  }
  return { layer, approximate, onsets };
}

function subsectionSpans(
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

function detectContentGapSpans(
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
    if (
      classified[i]!.kind === "gap" &&
      classified[i + 1]!.kind === "gap"
    ) {
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

function splitCountsByContentBars(
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
  let assigned = floors.reduce((a, b) => a + b, 0);
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

function containingSection(
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

function isSungTekst(clip: TekstClip): boolean {
  if (isCountdownDigitClipId(clip.id)) return false;
  const t = clip.text.trim();
  if (!t) return false;
  if (/^\d+$/.test(t) && clip.startTicks < 0) return false;
  return true;
}

/** Prefer sourceSection name affinity; fallback containingSection(startTicks). */
function membershipTekstBySection(
  project: Project,
  sections: FormaClip[],
): Map<string, TekstClip[]> {
  const buckets = new Map<string, TekstClip[]>();
  const byKey = new Map<string, FormaClip>();
  for (const sec of sections) {
    buckets.set(sec.id, []);
    const key = normalizeSectionNameKey(sec.name);
    if (key && !byKey.has(key)) byKey.set(key, sec);
  }

  const assigned = new Set<string>();

  for (const clip of project.tekst.clips) {
    if (!isSungTekst(clip)) continue;
    const src = clip.sourceSection?.trim() ?? "";
    if (!src) continue;
    const host = byKey.get(normalizeSectionNameKey(src));
    if (!host || !buckets.has(host.id)) continue;
    buckets.get(host.id)!.push(clip);
    assigned.add(clip.id);
  }

  for (const clip of project.tekst.clips) {
    if (!isSungTekst(clip) || assigned.has(clip.id)) continue;
    const host = containingSection(sections, clip.startTicks, project);
    if (!host || !buckets.has(host.id)) continue;
    buckets.get(host.id)!.push(clip);
  }

  for (const list of buckets.values()) {
    list.sort(
      (a, b) => a.startTicks - b.startTicks || a.id.localeCompare(b.id),
    );
  }
  return buckets;
}

/**
 * Prefer sourceLineId → vocal.sourceSection → Forma name; else startTicks span.
 */
function membershipAkordyBySection(
  project: Project,
  sections: FormaClip[],
): Map<string, AkordClip[]> {
  const buckets = new Map<string, AkordClip[]>();
  const byName = new Map<string, FormaClip>();
  for (const sec of sections) {
    buckets.set(sec.id, []);
    const key = normalizeSectionNameKey(sec.name);
    if (key && !byName.has(key)) byName.set(key, sec);
  }

  const linesById = new Map<string, TekstClip>();
  for (const line of project.tekst.clips) {
    linesById.set(line.id, line);
  }

  for (const clip of project.akordy.clips) {
    if (isCountdownDigitClipId(clip.id)) continue;

    let assignedSec: FormaClip | null = null;
    const srcLineId = clip.sourceLineId?.trim() ?? "";
    if (srcLineId && linesById.has(srcLineId)) {
      const line = linesById.get(srcLineId)!;
      const srcName = line.sourceSection?.trim() ?? "";
      if (srcName) {
        const hit = byName.get(normalizeSectionNameKey(srcName));
        if (hit) assignedSec = hit;
      }
      if (!assignedSec) {
        assignedSec = containingSection(
          sections,
          line.startTicks,
          project,
        );
      }
    }
    if (!assignedSec) {
      assignedSec = containingSection(sections, clip.startTicks, project);
    }
    if (assignedSec && buckets.has(assignedSec.id)) {
      buckets.get(assignedSec.id)!.push(clip);
    }
  }

  for (const list of buckets.values()) {
    list.sort(
      (a, b) => a.startTicks - b.startTicks || a.id.localeCompare(b.id),
    );
  }
  return buckets;
}

function sealTekstLengths(
  clips: TekstClip[],
  endTicks: number,
): TekstClip[] {
  if (clips.length === 0) return clips;
  const sorted = [...clips].sort(
    (a, b) => a.startTicks - b.startTicks || a.id.localeCompare(b.id),
  );
  return sorted.map((c, i) => {
    const end =
      i + 1 < sorted.length ? sorted[i + 1]!.startTicks : endTicks;
    return {
      ...c,
      lengthTicks: Math.max(1, end - c.startTicks),
    };
  });
}

type PlaceChunkResult = {
  placed: number;
  approximate: boolean;
  layer: string | null;
};

function placeChunkOnsets(
  project: Project,
  chunk: ContentLike[],
  spanStart: number,
  spanLengthTicks: number,
  onsetById: Map<string, number>,
  kind: "tekst" | "akordy",
): PlaceChunkResult {
  if (!chunk.length) return { placed: 0, approximate: false, layer: null };
  if (chunk.length === 1) {
    onsetById.set(chunk[0]!.id, snapTicks(project, spanStart, spanStart));
    return { placed: 1, approximate: false, layer: "E" };
  }
  const res = placeInSpan(project, chunk, spanStart, spanLengthTicks, kind);
  for (let i = 0; i < chunk.length; i++) {
    onsetById.set(chunk[i]!.id, res.onsets[i]!);
  }
  return {
    placed: chunk.length,
    approximate: res.approximate,
    layer: res.layer,
  };
}

type PlaceSectionResult = {
  placed: number;
  approximate: boolean;
  layer: string | null;
};

function placeSectionContent(
  project: Project,
  sec: FormaClip,
  lines: ContentLike[],
  onsetById: Map<string, number>,
  kind: "tekst" | "akordy",
): PlaceSectionResult {
  if (!lines.length) {
    return { placed: 0, approximate: false, layer: null };
  }
  if (lines.length === 1) {
    onsetById.set(
      lines[0]!.id,
      snapTicks(project, sec.startTicks, sec.startTicks),
    );
    return { placed: 1, approximate: false, layer: "E" };
  }
  const contentSpans = detectContentGapSpans(project, sec);
  if (contentSpans && contentSpans.length >= 1) {
    const counts = splitCountsByContentBars(lines.length, contentSpans);
    let offset = 0;
    let placed = 0;
    let anyApprox = false;
    const subLayers = new Set<string>();
    for (let ci = 0; ci < contentSpans.length; ci++) {
      const count = counts[ci] || 0;
      if (count <= 0) continue;
      const chunk = lines.slice(offset, offset + count);
      offset += count;
      const res = placeChunkOnsets(
        project,
        chunk,
        contentSpans[ci]!.startTicks,
        contentSpans[ci]!.lengthTicks,
        onsetById,
        kind,
      );
      placed += res.placed;
      if (res.approximate) anyApprox = true;
      if (res.layer) subLayers.add(res.layer);
    }
    if (offset < lines.length && contentSpans.length) {
      const last = contentSpans[contentSpans.length - 1]!;
      const chunk = lines.slice(offset);
      const res = placeChunkOnsets(
        project,
        chunk,
        last.startTicks,
        last.lengthTicks,
        onsetById,
        kind,
      );
      placed += res.placed;
      if (res.approximate) anyApprox = true;
    }
    const approxLayers =
      kind === "tekst"
        ? subLayers.has("B") || subLayers.has("F")
        : subLayers.has("B");
    return {
      placed,
      approximate: anyApprox || approxLayers,
      layer: "C",
    };
  }
  const res = placeChunkOnsets(
    project,
    lines,
    sec.startTicks,
    sec.lengthTicks,
    onsetById,
    kind,
  );
  return res;
}

function placeTekstFromForma(
  project: Project,
  scope: WandScope,
): WandResult {
  const sections = musicSections(project);
  if (!sections.length) {
    return {
      project,
      ok: false,
      placed: 0,
      message: "Brak sekcji Formy",
    };
  }
  const filter = sectionFilter(scope);
  if (filter && filter.size === 0) {
    return {
      project,
      ok: false,
      placed: 0,
      message: "Brak sekcji Formy w zakresie",
    };
  }
  const sung = project.tekst.clips.filter(isSungTekst);
  if (!sung.length) {
    return {
      project,
      ok: false,
      placed: 0,
      message: "Brak linii Tekstu",
    };
  }

  const buckets = membershipTekstBySection(project, sections);
  const onsetById = new Map<string, number>();
  let placed = 0;
  let approxN = 0;

  for (const sec of sections) {
    if (!sectionInFilter(filter, sec.id)) continue;
    const lines = buckets.get(sec.id) ?? [];
    const res = placeSectionContent(project, sec, lines, onsetById, "tekst");
    placed += res.placed;
    if (res.approximate) approxN += 1;
  }

  if (!placed) {
    return {
      project,
      ok: false,
      placed: 0,
      message: filter
        ? "Brak linii Tekstu w zaznaczonych sekcjach"
        : "Brak linii do rozmieszczenia",
    };
  }

  const endTicks = projectEndTicks(project);
  const nextClips = sealTekstLengths(
    project.tekst.clips.map((c) => {
      const start = onsetById.get(c.id);
      if (start == null) return c;
      return { ...c, startTicks: start };
    }),
    endTicks,
  );

  return {
    project: { ...project, tekst: { clips: nextClips } },
    ok: true,
    placed,
    approximate: approxN > 0,
    message:
      `Tekst → Forma: ${placed} linii` +
      (approxN ? `, ${approxN} przybliżonych` : ""),
  };
}

type VocalSpan = {
  line: TekstClip;
  startTicks: number;
  lengthTicks: number;
};

function getSectionVocalSpans(
  project: Project,
  sec: FormaClip,
): VocalSpan[] {
  const secStart = sec.startTicks;
  const secEnd = sec.startTicks + sec.lengthTicks;
  const secKey = normalizeSectionNameKey(sec.name);
  const lines = project.tekst.clips.filter(isSungTekst);
  const bySrc: TekstClip[] = [];
  const byAbs: TekstClip[] = [];
  for (const line of lines) {
    const src = line.sourceSection?.trim() ?? "";
    if (src && secKey && normalizeSectionNameKey(src) === secKey) {
      bySrc.push(line);
      continue;
    }
    if (line.startTicks >= secStart && line.startTicks < secEnd) {
      byAbs.push(line);
    }
  }
  const chosen = (bySrc.length ? bySrc : byAbs)
    .slice()
    .sort((a, b) => a.startTicks - b.startTicks || a.id.localeCompare(b.id));
  if (!chosen.length) return [];

  return chosen.map((line, i) => {
    const start = Math.max(secStart, line.startTicks);
    let end: number;
    if (i + 1 < chosen.length) {
      end = Math.min(secEnd, chosen[i + 1]!.startTicks);
    } else {
      end = secEnd;
    }
    end = Math.min(secEnd, Math.max(start + 1, end));
    return {
      line,
      startTicks: start,
      lengthTicks: Math.max(1, end - start),
    };
  });
}

function clusterClipsByPackedBar(
  project: Project,
  clips: AkordClip[],
  secStart: number,
): AkordClip[][] {
  const bar = barTicksAt(project, secStart);
  const sorted = [...clips].sort(
    (a, b) => a.startTicks - b.startTicks || a.id.localeCompare(b.id),
  );
  const byBar = new Map<number, AkordClip[]>();
  for (const clip of sorted) {
    const idx = Math.floor((clip.startTicks - secStart) / bar + 1e-9);
    if (!byBar.has(idx)) byBar.set(idx, []);
    byBar.get(idx)!.push(clip);
  }
  return [...byBar.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, group]) => group);
}

/**
 * Prefer sourceLineId; else packed-bar clusters when count matches;
 * else null → full-section placement.
 */
function assignClipsToVocalSpans(
  project: Project,
  clips: AkordClip[],
  spans: VocalSpan[],
  secStart: number,
): { span: VocalSpan; clips: AkordClip[] }[] | null {
  if (!clips.length || !spans.length) return null;

  const byLineId = new Map<string, AkordClip[]>();
  for (const sp of spans) {
    byLineId.set(sp.line.id, []);
  }
  let tagged = 0;
  for (const clip of clips) {
    const sid = clip.sourceLineId?.trim() ?? "";
    if (sid && byLineId.has(sid)) {
      byLineId.get(sid)!.push(clip);
      tagged += 1;
    }
  }
  if (tagged > 0) {
    return spans.map((sp) => {
      const group = byLineId.get(sp.line.id) ?? [];
      group.sort(
        (a, b) => a.startTicks - b.startTicks || a.id.localeCompare(b.id),
      );
      return { span: sp, clips: group };
    });
  }

  const clusters = clusterClipsByPackedBar(project, clips, secStart);
  if (clusters.length === spans.length) {
    return spans.map((sp, i) => ({ span: sp, clips: clusters[i]! }));
  }
  return null;
}

function placeAkordyFromForma(
  project: Project,
  scope: WandScope,
): WandResult {
  const sections = musicSections(project);
  if (!sections.length) {
    return {
      project,
      ok: false,
      placed: 0,
      message: "Brak sekcji Formy",
    };
  }
  const filter = sectionFilter(scope);
  if (filter && filter.size === 0) {
    return {
      project,
      ok: false,
      placed: 0,
      message: "Brak sekcji Formy w zakresie",
    };
  }
  if (!project.akordy.clips.length) {
    return {
      project,
      ok: false,
      placed: 0,
      message: "Brak clipów Akordów",
    };
  }

  const buckets = membershipAkordyBySection(project, sections);
  const onsetById = new Map<string, number>();
  let placed = 0;
  let approxN = 0;
  let lineN = 0;

  for (const sec of sections) {
    if (!sectionInFilter(filter, sec.id)) continue;
    const clips = buckets.get(sec.id) ?? [];
    if (!clips.length) continue;

    const vocalSpans = getSectionVocalSpans(project, sec);
    const lineGroups =
      vocalSpans.length > 0
        ? assignClipsToVocalSpans(
            project,
            clips,
            vocalSpans,
            sec.startTicks,
          )
        : null;

    if (lineGroups) {
      lineN += 1;
      let anyApprox = false;
      for (const { span, clips: chunk } of lineGroups) {
        if (!chunk.length) continue;
        const res = placeChunkOnsets(
          project,
          chunk,
          span.startTicks,
          span.lengthTicks,
          onsetById,
          "akordy",
        );
        placed += res.placed;
        if (res.approximate) anyApprox = true;
      }
      if (anyApprox) approxN += 1;
      continue;
    }

    const res = placeSectionContent(
      project,
      sec,
      clips,
      onsetById,
      "akordy",
    );
    placed += res.placed;
    if (res.approximate) approxN += 1;
  }

  if (!placed) {
    return {
      project,
      ok: false,
      placed: 0,
      message: filter
        ? "Brak clipów Akordów w zaznaczonych sekcjach"
        : "Brak clipów do rozmieszczenia",
    };
  }

  const nextClips = sealAkordyLengths(
    project.akordy.clips.map((c) => {
      const start = onsetById.get(c.id);
      if (start == null) return c;
      return { ...c, startTicks: start };
    }),
  );

  return {
    project: { ...project, akordy: { clips: nextClips } },
    ok: true,
    placed,
    approximate: approxN > 0,
    message:
      `Akordy → Forma: ${placed} clipów` +
      (lineN ? ` (${lineN} sekcji po wersach)` : "") +
      (approxN ? `, ${approxN} przybliżonych` : ""),
  };
}

/**
 * Place Tekst and/or Akordy onto Forma section lengths.
 * Forma is never modified (v4 `placeVocalsFromForma` / `placeChordsFromForma`).
 */
export function placeContentFromForma(
  project: Project,
  mode: WandMode,
  scope: WandScope = {},
): WandResult {
  if (mode === "tekst") return placeTekstFromForma(project, scope);
  if (mode === "akordy") return placeAkordyFromForma(project, scope);

  const vocals = placeTekstFromForma(project, scope);
  if (!vocals.ok) return vocals;
  const chords = placeAkordyFromForma(vocals.project, scope);
  if (!chords.ok) {
    return {
      ...chords,
      project: vocals.project,
      approximate: vocals.approximate,
      message: chords.message
        ? `Tekst OK, ale ${chords.message}`
        : "Tekst OK, ale Akordy się nie udały",
    };
  }
  return {
    project: chords.project,
    ok: true,
    placed: vocals.placed + chords.placed,
    approximate: Boolean(vocals.approximate || chords.approximate),
    message: `Tekst + Akordy → Forma: ${vocals.placed} linii, ${chords.placed} clipów`,
  };
}

/** @deprecated Use {@link placeContentFromForma} — name was inverted vs v4. */
export function wandContentToForma(
  project: Project,
  mode: WandMode,
  scope: WandScope = {},
): Project {
  return placeContentFromForma(project, mode, scope).project;
}
