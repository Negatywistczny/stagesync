import { isCountdownDigitClipId } from "../countdown-content.js";
import { projectEndTicks } from "../../project/project-bounds.js";
import type { FormaClip, Project, TekstClip } from "../../project/schema.js";
import {
  barDurationsABD,
  barDurationsWeighted,
  barsInSpan,
  beatTicksAt,
  containingSection,
  detectContentGapSpans,
  musicSections,
  normalizeSectionNameKey,
  onsetsFromBarDurations,
  sectionFilter,
  sectionInFilter,
  shouldUseTextWeights,
  snapTicks,
  splitCountsByContentBars,
  type ContentLike,
  type PlaceChunkResult,
  type PlaceSectionResult,
  type WandResult,
  type WandScope,
} from "./wand-types.js";

export function isSungTekst(clip: TekstClip): boolean {
  if (isCountdownDigitClipId(clip.id)) return false;
  const t = clip.text.trim();
  if (!t) return false;
  if (/^\d+$/.test(t) && clip.startTicks < 0) return false;
  return true;
}

/** Tekst layers A–F (v4 `pickLayerAndDurations`). */
export function pickLayerAndDurations(
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

export function placeTekstInSpan(
  project: Project,
  lines: ContentLike[],
  spanStart: number,
  spanLengthTicks: number,
): { layer: string | null; approximate: boolean; onsets: number[] } {
  if (!lines.length) return { layer: null, approximate: false, onsets: [] };
  const bars = barsInSpan(project, spanStart, spanLengthTicks);
  const picked = pickLayerAndDurations(bars, lines);
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

export function placeTekstChunkOnsets(
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
  const res = placeTekstInSpan(project, chunk, spanStart, spanLengthTicks);
  for (let i = 0; i < chunk.length; i++) {
    onsetById.set(chunk[i]!.id, res.onsets[i]!);
  }
  return {
    placed: chunk.length,
    approximate: res.approximate,
    layer: res.layer,
  };
}

export function placeTekstSectionContent(
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
      const res = placeTekstChunkOnsets(
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
      const res = placeTekstChunkOnsets(
        project,
        chunk,
        last.startTicks,
        last.lengthTicks,
        onsetById,
      );
      placed += res.placed;
      if (res.approximate) anyApprox = true;
    }
    const approxLayers = subLayers.has("B") || subLayers.has("F");
    return {
      placed,
      approximate: anyApprox || approxLayers,
      layer: "C",
    };
  }
  return placeTekstChunkOnsets(
    project,
    lines,
    sec.startTicks,
    sec.lengthTicks,
    onsetById,
  );
}

export function membershipTekstBySection(
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

export function sealTekstLengths(
  clips: TekstClip[],
  endTicks: number,
): TekstClip[] {
  if (clips.length === 0) return clips;
  const sorted = [...clips].sort(
    (a, b) => a.startTicks - b.startTicks || a.id.localeCompare(b.id),
  );
  return sorted.map((c, i) => {
    const end = i + 1 < sorted.length ? sorted[i + 1]!.startTicks : endTicks;
    const lengthTicks = Math.max(1, end - c.startTicks);
    const next = { ...c, lengthTicks };
    if ((next.blocks?.length ?? 0) !== 1) return next;
    const only = next.blocks[0]!;
    return {
      ...next,
      blocks: [
        {
          ...only,
          startTicks: next.startTicks,
          lengthTicks: next.lengthTicks,
          text: next.text,
        },
      ],
    };
  });
}

export function placeTekstFromForma(
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
    const res = placeTekstSectionContent(project, sec, lines, onsetById);
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
