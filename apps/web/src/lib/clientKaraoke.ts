import {
  resolveFormaClipAt,
  resolveMeterAt,
  resolveTempoAt,
  ticksToBbt,
  toDisplayBar,
  type Project,
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

export function buildKaraokeLiveContext(
  project: Project | null,
  displayTicks: number,
): KaraokeLiveContext | null {
  if (!project) return null;
  const section = resolveFormaClipAt(project, displayTicks);
  const meter = resolveMeterAt(project, displayTicks);
  const tempo = resolveTempoAt(project, displayTicks);
  const bbt = ticksToBbt(displayTicks, meter, project.ppq);
  const tekst = resolveTekstClipAt(project, displayTicks);
  const lyricLine = tekst?.text?.trim() ? tekst.text : null;
  const clips = [...(project.tekst?.clips ?? [])]
    .filter((c) => c.text.trim().length > 0)
    .sort((a, b) => a.startTicks - b.startTicks);
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
