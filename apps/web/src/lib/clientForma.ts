/**
 * Client Forma / drums live context — bar strip progress (CL-05).
 */

import {
  resolveFormaClipAt,
  resolveMeterAt,
  resolveTempoAt,
  ticksToBbt,
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
};

export type FormaLiveContext = {
  sectionName: string;
  bbtLabel: string;
  tempoBpm: number;
  meterLabel: string;
  barInSection: number | null;
  beatsPerBar: number;
  currentBeat: number;
  segments: FormaSegmentLive[];
};

export function buildFormaLiveContext(
  project: Project | null,
  displayTicks: number,
): FormaLiveContext | null {
  if (!project) return null;

  const active = resolveFormaClipAt(project, displayTicks);
  const meter = resolveMeterAt(project, Math.max(0, displayTicks));
  const tempo = resolveTempoAt(project, Math.max(0, displayTicks));
  const bbt = ticksToBbt(
    Math.max(0, displayTicks),
    meter,
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
    };
  });

  const activeSeg = segments.find((s) => s.active) ?? null;
  const currentCell = activeSeg?.cells.find((c) => c.current) ?? null;

  return {
    sectionName: active?.name ?? "—",
    bbtLabel: `${toDisplayBar(bbt.bar)}.${bbt.beat}`,
    tempoBpm: tempo,
    meterLabel: `${meter.numerator}/${meter.denominator}`,
    barInSection: currentCell?.index ?? null,
    beatsPerBar: meter.numerator,
    currentBeat: bbt.beat,
    segments,
  };
}
