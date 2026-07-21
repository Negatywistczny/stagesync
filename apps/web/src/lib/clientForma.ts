/**
 * Client Forma / drums live context — hero + horizontal form strip (CL-05 / v4 drums-view).
 */

import {
  resolveFormaClipAt,
  resolveMeterAt,
  resolveTempoAt,
  syntheticCountdownDisplayFromProject,
  ticksToBbtAlongMeterMap,
  toDisplayBar,
  type FormaClip,
  type Project,
} from "@stagesync/shared";
import {
  buildBarCellsForClip,
  type ClientBarCell,
} from "./clientBarCells.js";

export type FormaSegmentLive = {
  id: string;
  name: string;
  kind: FormaClip["kind"];
  note?: string;
  barCount: number;
  cells: ClientBarCell[];
  active: boolean;
  /** Playhead past this segment's end. */
  past: boolean;
};

export type FormaLiveContext = {
  songTitle: string;
  sectionName: string;
  /** Hero title: CD digit or section name (v4 `buildHeroTitle`). */
  heroTitle: string;
  /** `{title} · {meter}` eyebrow. */
  heroEyebrow: string;
  /** `takt X.Y · beat N · M. takt w części`. */
  heroMeta: string;
  bbtLabel: string;
  tempoBpm: number;
  meterLabel: string;
  barInSection: number | null;
  beatsPerBar: number;
  currentBeat: number;
  isCountdown: boolean;
  countdownNumber: string | null;
  activeNote: string | null;
  activeClipId: string | null;
  segments: FormaSegmentLive[];
};

function resolveCountdownDigit(
  project: Project,
  displayTicks: number,
): string | null {
  const cd = project.forma.clips.find((c) => c.kind === "countdown");
  if (!cd) return null;
  const end = cd.startTicks + cd.lengthTicks;
  if (displayTicks < cd.startTicks || displayTicks >= end) return null;
  const { akordy } = syntheticCountdownDisplayFromProject(project);
  const hit = akordy.find(
    (c) =>
      displayTicks >= c.startTicks &&
      displayTicks < c.startTicks + c.lengthTicks,
  );
  return hit?.symbol ?? null;
}

export function buildFormaLiveContext(
  project: Project | null,
  displayTicks: number,
): FormaLiveContext | null {
  if (!project) return null;

  const active = resolveFormaClipAt(project, displayTicks);
  const meter = resolveMeterAt(project, Math.max(0, displayTicks));
  const tempo = resolveTempoAt(project, Math.max(0, displayTicks));
  const bbt = ticksToBbtAlongMeterMap(
    Math.max(0, displayTicks),
    project.defaultMeter,
    project.meterMap,
    project.ppq,
  );

  const clips = project.forma.clips.filter(
    (c) => c.kind === "section" || c.kind === "countdown",
  );

  const segments: FormaSegmentLive[] = clips.map((clip) => {
    const clipEnd = clip.startTicks + clip.lengthTicks;
    const cells = buildBarCellsForClip(
      project,
      clip.startTicks,
      clipEnd,
      displayTicks,
    );
    return {
      id: clip.id,
      name: clip.name,
      kind: clip.kind,
      note: clip.kind === "section" ? clip.note : undefined,
      barCount: cells.length,
      cells,
      active: active?.id === clip.id,
      past: displayTicks >= clipEnd,
    };
  });

  const activeSeg = segments.find((s) => s.active) ?? null;
  const currentCell = activeSeg?.cells.find((c) => c.current) ?? null;
  const countdownNumber = resolveCountdownDigit(project, displayTicks);
  const isCountdown =
    active?.kind === "countdown" || countdownNumber != null;
  const meterLabel = `${meter.numerator}/${meter.denominator}`;
  const bbtLabel = `${toDisplayBar(bbt.bar)}.${bbt.beat}`;
  const barInSection = currentCell?.index ?? null;

  const heroTitle =
    countdownNumber ??
    active?.name ??
    segments.find((s) => s.kind === "section")?.name ??
    "—";

  const heroMetaParts = [
    `takt ${bbtLabel}`,
    `beat ${bbt.beat}`,
  ];
  if (barInSection != null && activeSeg) {
    heroMetaParts.push(`${barInSection}. takt w części`);
  }

  const activeNote =
    active?.kind === "section" && active.note?.trim()
      ? active.note.trim()
      : null;

  return {
    songTitle: project.name,
    sectionName: active?.name ?? "—",
    heroTitle,
    heroEyebrow: [project.name, meterLabel].filter(Boolean).join(" · "),
    heroMeta: heroMetaParts.join(" · "),
    bbtLabel,
    tempoBpm: tempo,
    meterLabel,
    barInSection,
    beatsPerBar: meter.numerator,
    currentBeat: bbt.beat,
    isCountdown: Boolean(isCountdown),
    countdownNumber,
    activeNote,
    activeClipId: active?.id ?? null,
    segments,
  };
}
