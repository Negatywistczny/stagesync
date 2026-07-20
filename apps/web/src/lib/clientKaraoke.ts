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

export type KaraokeLiveContext = {
  songTitle: string;
  sectionName: string;
  bbtLabel: string;
  tempoBpm: number;
  meterLabel: string;
  hasLyricLines: boolean;
  lyricLine: string | null;
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
  const hasLyricLines = (project.tekst?.clips ?? []).some((c) =>
    c.text.trim().length > 0,
  );
  return {
    songTitle: project.name,
    sectionName: section?.name ?? "—",
    bbtLabel: `${toDisplayBar(bbt.bar)}.${bbt.beat}`,
    tempoBpm: tempo,
    meterLabel: `${meter.numerator}/${meter.denominator}`,
    hasLyricLines,
    lyricLine,
  };
}

export function formatKaraokeTransportLine(
  ctx: KaraokeLiveContext,
  fallbackMeter: TimeSignature,
): string {
  return `${ctx.sectionName} · takt ${ctx.bbtLabel} · ${ctx.tempoBpm} BPM · ${ctx.meterLabel || `${fallbackMeter.numerator}/${fallbackMeter.denominator}`}`;
}
