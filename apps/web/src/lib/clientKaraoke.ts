import {
  resolveFormaClipAt,
  resolveMeterAt,
  resolveTempoAt,
  syntheticCountdownDisplayFromProject,
  ticksToBbt,
  toDisplayBar,
  type Project,
  type TekstClip,
  type TimeSignature,
} from "@stagesync/shared";
import { resolveTekstClipAt } from "./tekstEdit.js";

export type KaraokeLine = {
  id: string;
  text: string;
  startTicks: number;
  active: boolean;
};

export type KaraokeLiveContext = {
  songTitle: string;
  sectionName: string;
  bbtLabel: string;
  tempoBpm: number;
  meterLabel: string;
  hasLyricLines: boolean;
  lyricLine: string | null;
  /** Stage window: previous + current + upcoming lines. */
  lines: KaraokeLine[];
};

/** Persisted Tekst + synthetic CD digits (display-only) when playhead in/near CD. */
export function mergeTekstWithCountdownDigits(
  project: Project,
  displayTicks: number,
): TekstClip[] {
  const cd = project.forma.clips.find((c) => c.kind === "countdown");
  const cdEnd = cd != null ? cd.startTicks + cd.lengthTicks : 0;
  // Show digits while playhead is still in Countdown (or before song start).
  const includeDigits = displayTicks < cdEnd;
  const synth = includeDigits
    ? syntheticCountdownDisplayFromProject(project).tekst
    : [];
  const real = (project.tekst?.clips ?? []).filter(
    (c) => !/^vl-cd-/i.test(c.id),
  );
  return [...synth, ...real].sort(
    (a, b) =>
      a.startTicks - b.startTicks || a.id.localeCompare(b.id),
  );
}

function resolveMergedTekstAt(
  clips: TekstClip[],
  atTicks: number,
): TekstClip | null {
  for (const clip of clips) {
    if (
      atTicks >= clip.startTicks &&
      atTicks < clip.startTicks + clip.lengthTicks
    ) {
      return clip;
    }
  }
  return null;
}

export function buildKaraokeLiveContext(
  project: Project | null,
  displayTicks: number,
): KaraokeLiveContext | null {
  if (!project) return null;
  const section = resolveFormaClipAt(project, displayTicks);
  const meter = resolveMeterAt(project, displayTicks);
  const tempo = resolveTempoAt(project, displayTicks);
  const bbt = ticksToBbt(displayTicks, meter, project.ppq);
  const clips = mergeTekstWithCountdownDigits(project, displayTicks).filter(
    (c) => c.text.trim().length > 0,
  );
  const tekst =
    resolveMergedTekstAt(clips, displayTicks) ??
    resolveTekstClipAt(project, displayTicks);
  const lyricLine = tekst?.text?.trim() ? tekst.text : null;
  const hasLyricLines = clips.length > 0;

  let activeIdx = clips.findIndex(
    (c) =>
      displayTicks >= c.startTicks &&
      displayTicks < c.startTicks + c.lengthTicks,
  );
  if (activeIdx < 0 && clips.length > 0) {
    // Between clips — show nearest upcoming, else last past.
    const next = clips.findIndex((c) => c.startTicks > displayTicks);
    activeIdx = next >= 0 ? next : clips.length - 1;
  }

  const windowStart = Math.max(0, activeIdx - 1);
  const windowEnd = Math.min(clips.length, activeIdx + 3);
  const lines: KaraokeLine[] = clips.slice(windowStart, windowEnd).map((c) => ({
    id: c.id,
    text: c.text,
    startTicks: c.startTicks,
    active: activeIdx >= 0 && c.id === clips[activeIdx]!.id,
  }));

  return {
    songTitle: project.name,
    sectionName: section?.name ?? "—",
    bbtLabel: `${toDisplayBar(bbt.bar)}.${bbt.beat}`,
    tempoBpm: tempo,
    meterLabel: `${meter.numerator}/${meter.denominator}`,
    hasLyricLines,
    lyricLine,
    lines,
  };
}

export function formatKaraokeTransportLine(
  ctx: KaraokeLiveContext,
  fallbackMeter: TimeSignature,
): string {
  return `${ctx.sectionName} · takt ${ctx.bbtLabel} · ${ctx.tempoBpm} BPM · ${ctx.meterLabel || `${fallbackMeter.numerator}/${fallbackMeter.denominator}`}`;
}
