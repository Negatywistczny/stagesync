import { isCountdownDigitClipId } from "../countdown-content.js";
import type {
  AkordClip,
  FormaClip,
  Project,
  TekstClip,
} from "../../project/schema.js";
import { sealAkordyLengths } from "../../import/ug/ug-import.js";
import {
  barDurationsABD,
  barTicksAt,
  barsInSpan,
  beatTicksAt,
  containingSection,
  detectContentGapSpans,
  musicSections,
  normalizeSectionNameKey,
  onsetsFromBarDurations,
  sectionFilter,
  sectionInFilter,
  snapTicks,
  splitCountsByContentBars,
  type ContentLike,
  type PlaceChunkResult,
  type PlaceSectionResult,
  type WandResult,
  type WandScope,
} from "./wand-types.js";
import { isSungTekst } from "./wand-lyrics.js";

/** Akordy layers E → D → A → B (no F). */
export function pickChordLayerAndDurations(
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

export function placeAkordyInSpan(
  project: Project,
  lines: ContentLike[],
  spanStart: number,
  spanLengthTicks: number,
): { layer: string | null; approximate: boolean; onsets: number[] } {
  if (!lines.length) return { layer: null, approximate: false, onsets: [] };
  const bars = barsInSpan(project, spanStart, spanLengthTicks);
  const picked = pickChordLayerAndDurations(bars, lines.length);
  const { layer, durs, approximate } = picked;
  const onsets = onsetsFromBarDurations(project, spanStart, durs);
  const spanEnd = spanStart + spanLengthTicks;
  const minDur = beatTicksAt(project, spanStart);
  for (let i = 0; i < onsets.length; i++) {
    const maxStart = spanEnd - minDur;
    if (onsets[i]! > maxStart) {
      onsets[i] = snapTicks(project, Math.max(spanStart, maxStart), spanStart);
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

export function placeAkordyChunkOnsets(
  project: Project,
  chunk: ContentLike[],
  spanStart: number,
  spanLengthTicks: number,
  onsetById: Map<string, number>,
): PlaceChunkResult {
  if (!chunk.length) return { placed: 0, approximate: false, layer: null };
  if (chunk.length === 1) {
    onsetById.set(chunk[0]!.id, snapTicks(project, spanStart, spanStart));
    return { placed: 1, approximate: false, layer: "E" };
  }
  const res = placeAkordyInSpan(project, chunk, spanStart, spanLengthTicks);
  for (let i = 0; i < chunk.length; i++) {
    onsetById.set(chunk[i]!.id, res.onsets[i]!);
  }
  return {
    placed: chunk.length,
    approximate: res.approximate,
    layer: res.layer,
  };
}

export function placeAkordySectionContent(
  project: Project,
  sec: FormaClip,
  lines: ContentLike[],
  onsetById: Map<string, number>,
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
      const res = placeAkordyChunkOnsets(
        project,
        chunk,
        contentSpans[ci]!.startTicks,
        contentSpans[ci]!.lengthTicks,
        onsetById,
      );
      placed += res.placed;
      if (res.approximate) anyApprox = true;
      if (res.layer) subLayers.add(res.layer);
    }
    if (offset < lines.length && contentSpans.length) {
      const last = contentSpans[contentSpans.length - 1]!;
      const chunk = lines.slice(offset);
      const res = placeAkordyChunkOnsets(
        project,
        chunk,
        last.startTicks,
        last.lengthTicks,
        onsetById,
      );
      placed += res.placed;
      if (res.approximate) anyApprox = true;
    }
    const approxLayers = subLayers.has("B");
    return {
      placed,
      approximate: anyApprox || approxLayers,
      layer: "C",
    };
  }
  return placeAkordyChunkOnsets(
    project,
    lines,
    sec.startTicks,
    sec.lengthTicks,
    onsetById,
  );
}

export function membershipAkordyBySection(
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
        assignedSec = containingSection(sections, line.startTicks, project);
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

export type VocalSpan = {
  line: TekstClip;
  startTicks: number;
  lengthTicks: number;
};

export function getSectionVocalSpans(
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

export function clusterClipsByPackedBar(
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
export function assignClipsToVocalSpans(
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

export function placeAkordyFromForma(
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
        ? assignClipsToVocalSpans(project, clips, vocalSpans, sec.startTicks)
        : null;

    if (lineGroups) {
      lineN += 1;
      let anyApprox = false;
      for (const { span, clips: chunk } of lineGroups) {
        if (!chunk.length) continue;
        const res = placeAkordyChunkOnsets(
          project,
          chunk,
          span.startTicks,
          span.lengthTicks,
          onsetById,
        );
        placed += res.placed;
        if (res.approximate) anyApprox = true;
      }
      if (anyApprox) approxN += 1;
      continue;
    }

    const res = placeAkordySectionContent(project, sec, clips, onsetById);
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
