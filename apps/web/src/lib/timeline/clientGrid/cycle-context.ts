import type { Project } from "@stagesync/shared";
import { resolveFormaClipAt } from "@stagesync/shared";
import { resolveAkordClipAt } from "@lib/timeline-edit/akordyEdit.js";
import type { ChordStepSpan, GridCycleStep, GridLiveContext } from "./types.js";
import {
  chordStepsForTickRange,
  mergeAkordyWithCountdownDigits,
  progressionForBarChords,
  resolveMergedAkordAt,
} from "./progression.js";
import {
  isNumericCountdownChord,
  resolveNextPhraseBand,
  sectionBarChords,
} from "./section-phrase.js";

function cycleWithActive(
  steps: { chord: string; bars: number }[],
  barIndexInSection: number,
): GridCycleStep[] {
  const cycleBars = steps.reduce((s, x) => s + x.bars, 0);
  if (cycleBars <= 0) return [];
  const pos = ((barIndexInSection % cycleBars) + cycleBars) % cycleBars;
  let cursor = 0;
  return steps.map((step) => {
    const start = cursor;
    const end = cursor + step.bars;
    cursor = end;
    const active = pos >= start && pos < end;
    return {
      symbol: step.chord,
      bars: step.bars,
      active,
      activeBarInStep: active ? pos - start + 1 : null,
      isSubBar: step.bars < 1 - 1e-6,
    };
  });
}

/** Mark active tile from playhead position within clip spans (not bar-start sampling). */
export function cycleStepsWithActive(
  steps: ChordStepSpan[],
  displayTicks: number,
): GridCycleStep[] {
  const t = Math.trunc(displayTicks);
  return steps.map((step) => {
    const active = t >= step.startTicks && t < step.endTicks;
    return {
      symbol: step.symbol,
      bars: step.barUnits,
      active,
      activeBarInStep: active ? 1 : null,
      isSubBar: step.barUnits < 1 - 1e-6,
    };
  });
}

function cyclePreview(steps: ChordStepSpan[]): GridCycleStep[] {
  return steps.map((step) => ({
    symbol: step.symbol,
    bars: step.barUnits,
    active: false,
    activeBarInStep: null,
    isSubBar: step.barUnits < 1 - 1e-6,
  }));
}

function cyclePreviewFromProgression(
  steps: { chord: string; bars: number }[],
): GridCycleStep[] {
  return steps.map((step) => ({
    symbol: step.chord,
    bars: step.bars,
    active: false,
    activeBarInStep: null,
    isSubBar: step.bars < 1 - 1e-6,
  }));
}

/**
 * Next hero chord — within the active row, then upcoming phrase row.
 */
export function resolveHeroNextSymbol(
  cycle: GridCycleStep[],
  nextCycle: GridCycleStep[],
): string | null {
  if (cycle.length === 0) {
    return nextCycle[0]?.symbol ?? null;
  }
  const activeIdx = cycle.findIndex((s) => s.active);
  if (activeIdx >= 0 && activeIdx + 1 < cycle.length) {
    return cycle[activeIdx + 1]!.symbol;
  }
  if (activeIdx >= 0) {
    return nextCycle[0]?.symbol ?? null;
  }
  return nextCycle[0]?.symbol ?? cycle[0]?.symbol ?? null;
}

/**
 * CSS `grid-template-columns` from bar durations — width ∝ bars (v4 `--slot-bar-units`).
 * Same duration → same track share; 2-bar chord = 2× a 1-bar chord.
 */
export function cycleGridTemplateColumns(
  steps: readonly { bars: number }[],
): string {
  if (steps.length === 0) return "";
  return steps
    .map((s) => {
      const units = Number.isFinite(s.bars) && s.bars > 0 ? s.bars : 1;
      return `${units}fr`;
    })
    .join(" ");
}

/** Sum of bar units in the cycle — drives proportional tile columns. */
export function cycleTotalBars(cycle: readonly GridCycleStep[]): number {
  return cycle.reduce((sum, step) => {
    const bars = Number.isFinite(step.bars) && step.bars > 0 ? step.bars : 0;
    return sum + bars;
  }, 0);
}

const emptyContext = (emptyReason: string | null): GridLiveContext => ({
  current: null,
  upcoming: [],
  emptyReason,
  cycle: [],
  nextCycle: [],
  hero: "—",
  heroNext: null,
  sectionName: null,
  subsectionIndex: null,
  subsectionCount: null,
  carouselKey: "",
  countdownPreview: false,
  isCountdown: false,
});

export function buildGridLiveContext(
  project: Project | null,
  displayTicks: number,
): GridLiveContext {
  if (!project) {
    return emptyContext("Oczekiwanie na utwór…");
  }
  const clips = mergeAkordyWithCountdownDigits(project, displayTicks);
  if (clips.length === 0) {
    return emptyContext(
      "Brak akordów — dodaj clipy na lane Akordy w Timeline.",
    );
  }
  const current =
    resolveMergedAkordAt(clips, displayTicks) ??
    resolveAkordClipAt(project, displayTicks);
  const upcoming = clips.filter((c) => c.startTicks > displayTicks).slice(0, 2);

  const section = resolveFormaClipAt(project, displayTicks);
  const isCountdown =
    section?.kind === "countdown" ||
    (current != null && isNumericCountdownChord(current.symbol));
  const countdownPreview = section?.kind === "countdown";

  const sectionInfo = countdownPreview
    ? null
    : sectionBarChords(project, displayTicks);
  const nextBand = resolveNextPhraseBand(project, displayTicks);

  let cycle: GridCycleStep[] = [];
  if (sectionInfo) {
    const spans = chordStepsForTickRange(
      project,
      clips,
      sectionInfo.rangeStart,
      sectionInfo.rangeEnd,
    );
    if (spans.length > 0) {
      cycle = cycleStepsWithActive(spans, displayTicks);
    } else if (sectionInfo.barChords.some((c) => c !== "—")) {
      const steps = progressionForBarChords(sectionInfo.barChords);
      cycle = cycleWithActive(steps, sectionInfo.barIndexInSection);
    }
  } else if (countdownPreview && current) {
    // Single active CD digit tile so hero/active still have a row identity.
    cycle = [
      {
        symbol: current.symbol,
        bars: 1,
        active: true,
        activeBarInStep: 1,
      },
    ];
  }

  const nextSpans =
    nextBand != null
      ? chordStepsForTickRange(
          project,
          clips,
          nextBand.rangeStart,
          nextBand.rangeEnd,
        )
      : [];
  const nextCycle =
    nextSpans.length > 0
      ? cyclePreview(nextSpans)
      : nextBand
        ? cyclePreviewFromProgression(
            progressionForBarChords(nextBand.barChords),
          )
        : [];

  const hero =
    current?.symbol?.trim() && current.symbol !== "—"
      ? current.symbol
      : (cycle.find((s) => s.active)?.symbol ?? "—");

  const heroNext = countdownPreview
    ? (upcoming[0]?.symbol ?? nextCycle[0]?.symbol ?? null)
    : resolveHeroNextSymbol(cycle, nextCycle);

  const carouselKey = countdownPreview
    ? `cd:${section?.id ?? "cd"}`
    : sectionInfo
      ? `${sectionInfo.sectionId}:${sectionInfo.subsectionIndex}`
      : current
        ? `clip:${current.id}`
        : "";

  return {
    current,
    upcoming,
    emptyReason: null,
    cycle: countdownPreview ? [] : cycle,
    nextCycle,
    hero,
    heroNext: heroNext && heroNext !== "—" ? heroNext : null,
    sectionName: countdownPreview
      ? (section?.name ?? "Countdown")
      : (sectionInfo?.sectionName ?? null),
    subsectionIndex: sectionInfo?.subsectionIndex ?? null,
    subsectionCount: sectionInfo?.subsectionCount ?? null,
    carouselKey,
    countdownPreview,
    isCountdown: Boolean(isCountdown),
  };
}
