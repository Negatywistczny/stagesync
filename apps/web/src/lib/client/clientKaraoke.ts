import {
  resolveFormaClipAt,
  resolveMeterAt,
  resolveTempoAt,
  ticksToBbtAlongMeterMap,
  toDisplayBar,
  type Project,
  type TimeSignature,
} from "@stagesync/shared";
import { resolveTekstClipAt } from "@lib/timeline-edit/tekstEdit.js";
import {
  collectTekstBlockRoles,
  filterTekstBlocksByRole,
  mergeTekstWithCountdownDigits,
  resolveActiveBlockId,
  resolveMergedTekstAt,
  toKaraokeLine,
  type KaraokeBuildOptions,
  type KaraokeLine,
  type KaraokeLiveContext,
} from "./karaoke/karaokeTypes.js";
import { groupKaraokeSections } from "./karaoke/karaokeSections.js";

export {
  ROLE_ORDER,
  TEKST_BLOCK_ROLE_LABELS,
  collectTekstBlockRoles,
  filterTekstBlocksByRole,
  highlightEndTicksForBlock,
  isPlaceholderLyric,
  mapKaraokeBlocks,
  mergeTekstWithCountdownDigits,
  resolveActiveBlockId,
  type KaraokeBuildOptions,
  type KaraokeLine,
  type KaraokeLineBlock,
  type KaraokeLiveContext,
  type KaraokeSectionGroup,
} from "./karaoke/karaokeTypes.js";

export {
  groupKaraokeSections,
  resolveFormaClipForLyric,
  resolveFormaClipForLyricStart,
} from "./karaoke/karaokeSections.js";

export function buildKaraokeLiveContext(
  project: Project | null,
  displayTicks: number,
  opts?: KaraokeBuildOptions,
): KaraokeLiveContext | null {
  if (!project) return null;
  const section = resolveFormaClipAt(project, displayTicks);
  const meter = resolveMeterAt(project, displayTicks);
  const tempo = resolveTempoAt(project, displayTicks);
  const bbt = ticksToBbtAlongMeterMap(
    displayTicks,
    project.defaultMeter,
    project.meterMap,
    project.ppq,
  );
  const clips = mergeTekstWithCountdownDigits(project, displayTicks).filter(
    (c) => c.text.trim().length > 0,
  );
  const tekst =
    resolveMergedTekstAt(clips, displayTicks) ??
    resolveTekstClipAt(project, displayTicks);
  const lyricLine = tekst?.text?.trim() ? tekst.text : null;
  const hasLyricLines = clips.length > 0;

  const activeIdx = clips.findIndex(
    (c) =>
      displayTicks >= c.startTicks &&
      displayTicks < c.startTicks + c.lengthTicks,
  );

  const activeLineId = activeIdx >= 0 ? (clips[activeIdx]?.id ?? null) : null;

  const availableRoles = collectTekstBlockRoles(clips);
  const requested = opts?.roleFilter ?? null;
  const roleFilter =
    availableRoles.length >= 2 &&
    requested != null &&
    availableRoles.includes(requested)
      ? requested
      : null;

  const lines: KaraokeLine[] = [];
  for (const c of clips) {
    const line = toKaraokeLine(c, displayTicks, activeLineId, roleFilter);
    if (line) lines.push(line);
  }

  const activeClip = activeIdx >= 0 ? (clips[activeIdx] ?? null) : null;
  const activeBlockId =
    activeClip != null
      ? resolveActiveBlockId(
          filterTekstBlocksByRole(activeClip.blocks ?? [], roleFilter),
          displayTicks,
          activeClip.startTicks + Math.max(1, activeClip.lengthTicks),
        )
      : null;

  const sections = groupKaraokeSections(
    project,
    clips,
    displayTicks,
    activeLineId,
    roleFilter,
  );

  const activeGroup =
    sections.find((s) => s.active) ??
    sections.find((s) => s.id === section?.id) ??
    null;

  const sectionBars = activeGroup?.useProgress === true ? activeGroup.bars : [];

  return {
    songTitle: project.name,
    sectionName: section?.name ?? "—",
    bbtLabel: `${toDisplayBar(bbt.bar)}.${bbt.beat}`,
    tempoBpm: tempo,
    meterLabel: `${meter.numerator}/${meter.denominator}`,
    hasLyricLines,
    lyricLine,
    lines,
    sections,
    sectionBars,
    currentBeat: bbt.beat,
    activeBlockId,
    availableRoles,
  };
}

export function formatKaraokeTransportLine(
  ctx: KaraokeLiveContext,
  fallbackMeter: TimeSignature,
): string {
  return `${ctx.sectionName} · takt ${ctx.bbtLabel} · ${ctx.tempoBpm} BPM · ${ctx.meterLabel || `${fallbackMeter.numerator}/${fallbackMeter.denominator}`}`;
}
