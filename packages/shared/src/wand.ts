/**
 * Różdżka — generate Forma sections from Tekst / Akordy content clips.
 * Pure; Countdown preserved; sections overwrite via insertSpanOverwrite.
 */

import { insertSpanOverwrite } from "./clip-collision.js";
import type { AkordClip, FormaClip, Project, TekstClip } from "./schema.js";

export type WandMode = "tekst" | "akordy" | "both";

/** Absolute tick ranges (selected Forma sections). Empty / omitted = whole song. */
export type WandScope = {
  ranges?: { startTicks: number; endTicks: number }[];
};

type ContentSpan = {
  startTicks: number;
  lengthTicks: number;
  name: string;
};

function spansFromTekst(clips: TekstClip[]): ContentSpan[] {
  return clips.map((c, i) => ({
    startTicks: c.startTicks,
    lengthTicks: c.lengthTicks,
    name: (c.text.trim().slice(0, 24) || `Tekst ${i + 1}`).trim(),
  }));
}

function spansFromAkordy(clips: AkordClip[]): ContentSpan[] {
  return clips.map((c, i) => ({
    startTicks: c.startTicks,
    lengthTicks: c.lengthTicks,
    name: c.symbol || `Akord ${i + 1}`,
  }));
}

function mergeSpans(a: ContentSpan[], b: ContentSpan[]): ContentSpan[] {
  const all = [...a, ...b].sort((x, y) => x.startTicks - y.startTicks);
  if (all.length === 0) return [];
  const out: ContentSpan[] = [];
  for (const span of all) {
    const last = out[out.length - 1];
    if (
      last &&
      span.startTicks <= last.startTicks + last.lengthTicks &&
      span.startTicks + span.lengthTicks <= last.startTicks + last.lengthTicks
    ) {
      continue;
    }
    if (last && span.startTicks < last.startTicks + last.lengthTicks) {
      last.lengthTicks = Math.max(
        last.lengthTicks,
        span.startTicks + span.lengthTicks - last.startTicks,
      );
      if (!last.name.includes(span.name)) {
        last.name = `${last.name} / ${span.name}`.slice(0, 40);
      }
      continue;
    }
    out.push({ ...span });
  }
  return out;
}

function overlapsRange(
  startTicks: number,
  lengthTicks: number,
  range: { startTicks: number; endTicks: number },
): boolean {
  const end = startTicks + lengthTicks;
  return startTicks < range.endTicks && end > range.startTicks;
}

function filterSpansToScope(
  spans: ContentSpan[],
  ranges: { startTicks: number; endTicks: number }[] | undefined,
): ContentSpan[] {
  if (!ranges?.length) return spans;
  return spans.filter((s) =>
    ranges.some((r) => overlapsRange(s.startTicks, s.lengthTicks, r)),
  );
}

/**
 * Replace Forma section clips with spans derived from content lanes.
 * Countdown clips are kept. With `scope.ranges`, only sections overlapping
 * those ranges are replaced; content outside the ranges is ignored.
 */
export function wandContentToForma(
  project: Project,
  mode: WandMode,
  scope: WandScope = {},
): Project {
  const ranges = scope.ranges?.filter((r) => r.endTicks > r.startTicks);
  const tekstSpans =
    mode === "tekst" || mode === "both"
      ? spansFromTekst(project.tekst.clips)
      : [];
  const akordSpans =
    mode === "akordy" || mode === "both"
      ? spansFromAkordy(project.akordy.clips)
      : [];

  const spans = filterSpansToScope(
    mode === "both"
      ? mergeSpans(tekstSpans, akordSpans)
      : mode === "tekst"
        ? tekstSpans
        : akordSpans,
    ranges,
  );

  const countdown = project.forma.clips.filter((c) => c.kind === "countdown");
  const floor =
    countdown.length > 0
      ? Math.max(
          0,
          ...countdown.map((c) => c.startTicks + c.lengthTicks),
        )
      : 0;

  const keptSections = ranges?.length
    ? project.forma.clips.filter(
        (c) =>
          c.kind === "section" &&
          !ranges.some((r) =>
            overlapsRange(c.startTicks, c.lengthTicks, r),
          ),
      )
    : [];

  let clips: FormaClip[] = [...countdown, ...keptSections];
  let n = 0;
  for (const span of spans) {
    if (span.lengthTicks < 1) continue;
    if (span.startTicks + span.lengthTicks <= floor && span.startTicks < floor) {
      continue;
    }
    n += 1;
    const section: FormaClip = {
      id: `forma-wand-${n}-${span.startTicks}`,
      name: span.name || `Sekcja ${n}`,
      kind: "section",
      startTicks: Math.max(floor, span.startTicks),
      lengthTicks: span.lengthTicks,
    };
    clips = insertSpanOverwrite(clips, section, { contentFloorTicks: floor });
  }

  return { ...project, forma: { clips } };
}
