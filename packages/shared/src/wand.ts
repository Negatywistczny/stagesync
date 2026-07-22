/**
 * Różdżka — place Tekst / Akordy onto existing Forma sections (v4 parity).
 * Pure; Forma clips are never mutated. Countdown / digit clips stay put.
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
};

type ContentLike = {
  id: string;
  startTicks: number;
  lengthTicks: number;
  text?: string;
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

function beatTicksAt(project: Project, atTicks: number): number {
  const meter = resolveMeterAt(project, atTicks);
  const bar = ticksPerBar(meter, project.ppq);
  const beats = Math.max(1, meter.numerator);
  return Math.max(1, Math.floor(bar / beats));
}

function barsInSpan(
  project: Project,
  startTicks: number,
  lengthTicks: number,
): number {
  const beat = beatTicksAt(project, startTicks);
  return Math.max(0, lengthTicks / beat);
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

function pickLayerAndDurations(
  bars: number,
  lines: ContentLike[],
): { layer: string; durs: number[]; approximate: boolean } {
  const n = lines.length;
  if (n === 1) return { layer: "E", durs: [bars], approximate: false };
  if (n > bars) {
    return { layer: "D", durs: barDurationsABD(bars, n), approximate: false };
  }
  if (bars % n === 0) {
    return { layer: "A", durs: barDurationsABD(bars, n), approximate: false };
  }
  const base = Math.floor(bars / n);
  if (base <= 1 && shouldUseTextWeights(lines)) {
    return {
      layer: "F",
      durs: barDurationsWeighted(bars, lines),
      approximate: true,
    };
  }
  return { layer: "B", durs: barDurationsABD(bars, n), approximate: true };
}

function onsetsFromBarDurations(
  project: Project,
  spanStart: number,
  durs: number[],
): number[] {
  const beat = beatTicksAt(project, spanStart);
  const onsets: number[] = [];
  let cursor = spanStart;
  for (const dur of durs) {
    onsets.push(snapTicks(project, cursor, spanStart));
    cursor += dur * beat;
  }
  return onsets;
}

function placeInSpan(
  project: Project,
  lines: ContentLike[],
  spanStart: number,
  spanLengthTicks: number,
): { layer: string | null; approximate: boolean; onsets: number[] } {
  if (!lines.length) return { layer: null, approximate: false, onsets: [] };
  const bars = barsInSpan(project, spanStart, spanLengthTicks);
  const { layer, durs, approximate } = pickLayerAndDurations(bars, lines);
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
  const oneBar = ticksPerBar(
    resolveMeterAt(project, sec.startTicks),
    project.ppq,
  );
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
        const bar = ticksPerBar(
          resolveMeterAt(project, next.startTicks),
          project.ppq,
        );
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

function membershipTekstBySection(
  project: Project,
  sections: FormaClip[],
): Map<string, TekstClip[]> {
  const buckets = new Map<string, TekstClip[]>();
  for (const sec of sections) buckets.set(sec.id, []);
  for (const clip of project.tekst.clips) {
    if (!isSungTekst(clip)) continue;
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

function membershipAkordyBySection(
  project: Project,
  sections: FormaClip[],
): Map<string, AkordClip[]> {
  const buckets = new Map<string, AkordClip[]>();
  for (const sec of sections) buckets.set(sec.id, []);
  for (const clip of project.akordy.clips) {
    if (isCountdownDigitClipId(clip.id)) continue;
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

function placeChunkOnsets(
  project: Project,
  chunk: ContentLike[],
  spanStart: number,
  spanLengthTicks: number,
  onsetById: Map<string, number>,
): number {
  if (chunk.length === 1) {
    onsetById.set(chunk[0]!.id, snapTicks(project, spanStart, spanStart));
    return 1;
  }
  const res = placeInSpan(project, chunk, spanStart, spanLengthTicks);
  for (let i = 0; i < chunk.length; i++) {
    onsetById.set(chunk[i]!.id, res.onsets[i]!);
  }
  return chunk.length;
}

function placeSectionContent(
  project: Project,
  sec: FormaClip,
  lines: ContentLike[],
  onsetById: Map<string, number>,
): number {
  if (!lines.length) return 0;
  if (lines.length === 1) {
    onsetById.set(
      lines[0]!.id,
      snapTicks(project, sec.startTicks, sec.startTicks),
    );
    return 1;
  }
  const contentSpans = detectContentGapSpans(project, sec);
  if (contentSpans && contentSpans.length >= 1) {
    const counts = splitCountsByContentBars(lines.length, contentSpans);
    let offset = 0;
    let placed = 0;
    for (let ci = 0; ci < contentSpans.length; ci++) {
      const count = counts[ci] || 0;
      if (count <= 0) continue;
      const chunk = lines.slice(offset, offset + count);
      offset += count;
      placed += placeChunkOnsets(
        project,
        chunk,
        contentSpans[ci]!.startTicks,
        contentSpans[ci]!.lengthTicks,
        onsetById,
      );
    }
    if (offset < lines.length && contentSpans.length) {
      const last = contentSpans[contentSpans.length - 1]!;
      const chunk = lines.slice(offset);
      placed += placeChunkOnsets(
        project,
        chunk,
        last.startTicks,
        last.lengthTicks,
        onsetById,
      );
    }
    return placed;
  }
  return placeChunkOnsets(
    project,
    lines,
    sec.startTicks,
    sec.lengthTicks,
    onsetById,
  );
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

  for (const sec of sections) {
    if (!sectionInFilter(filter, sec.id)) continue;
    const lines = buckets.get(sec.id) ?? [];
    placed += placeSectionContent(project, sec, lines, onsetById);
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
    message: `Tekst → Forma: ${placed} linii`,
  };
}

function vocalSpansForSection(
  project: Project,
  sec: FormaClip,
  tekstClips: TekstClip[],
): { startTicks: number; lengthTicks: number }[] {
  const secEnd = sec.startTicks + sec.lengthTicks;
  const sections = musicSections(project);
  const inSec = tekstClips
    .filter(isSungTekst)
    .filter((c) => {
      const host = containingSection(sections, c.startTicks, project);
      return host?.id === sec.id;
    })
    .sort((a, b) => a.startTicks - b.startTicks);
  if (!inSec.length) return [];
  return inSec.map((c, i) => {
    const end =
      i + 1 < inSec.length
        ? Math.min(secEnd, inSec[i + 1]!.startTicks)
        : secEnd;
    return {
      startTicks: Math.max(sec.startTicks, c.startTicks),
      lengthTicks: Math.max(1, end - Math.max(sec.startTicks, c.startTicks)),
    };
  });
}

function assignClipsToVocalSpans(
  clips: AkordClip[],
  spans: { startTicks: number; lengthTicks: number }[],
): { span: { startTicks: number; lengthTicks: number }; clips: AkordClip[] }[] {
  if (!spans.length) return [];
  const groups = spans.map((span) => ({ span, clips: [] as AkordClip[] }));
  for (const clip of clips) {
    let best = 0;
    for (let i = 0; i < spans.length; i++) {
      const s = spans[i]!;
      const end = s.startTicks + s.lengthTicks;
      if (clip.startTicks >= s.startTicks && clip.startTicks < end) {
        best = i;
        break;
      }
      if (clip.startTicks >= s.startTicks) best = i;
    }
    groups[best]!.clips.push(clip);
  }
  return groups.filter((g) => g.clips.length > 0);
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

  for (const sec of sections) {
    if (!sectionInFilter(filter, sec.id)) continue;
    const clips = buckets.get(sec.id) ?? [];
    if (!clips.length) continue;

    const vocalSpans = vocalSpansForSection(project, sec, project.tekst.clips);
    if (vocalSpans.length > 0) {
      const groups = assignClipsToVocalSpans(clips, vocalSpans);
      for (const { span, clips: chunk } of groups) {
        placed += placeChunkOnsets(
          project,
          chunk,
          span.startTicks,
          span.lengthTicks,
          onsetById,
        );
      }
      continue;
    }

    placed += placeSectionContent(project, sec, clips, onsetById);
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
    message: `Akordy → Forma: ${placed} clipów`,
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
      message: chords.message
        ? `Tekst OK, ale ${chords.message}`
        : "Tekst OK, ale Akordy się nie udały",
    };
  }
  return {
    project: chords.project,
    ok: true,
    placed: vocals.placed + chords.placed,
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
