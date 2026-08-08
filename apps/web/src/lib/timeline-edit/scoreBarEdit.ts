/**
 * Kotwice (scoreBarMap) mutations for Timeline.
 */

import {
  fromDisplayBar,
  normalizeAnchors,
  resolveMeterAt,
  snapTicksToBarStartAlongMeterMap,
  ticksPerBar,
  toDisplayBar,
  type Project,
  type ScoreBarAnchor,
} from "@stagesync/shared";

export function scoreAnchors(project: Project): ScoreBarAnchor[] {
  return normalizeAnchors(project.scoreBarMap ?? { anchors: [] });
}

export function logicBarFromTicks(project: Project, ticks: number): number {
  if (!Number.isFinite(ticks) || ticks <= 0) {
    return 1;
  }
  let cursor = 0;
  let bar = 0;
  while (cursor < ticks) {
    const meter = resolveMeterAt(project, cursor);
    const barLen = ticksPerBar(meter, project.ppq);
    if (cursor + barLen > ticks) break;
    cursor += barLen;
    bar += 1;
    if (bar > 100_000) break;
  }
  return Math.max(1, toDisplayBar(bar));
}

/**
 * Song display bar → tick at bar start, walking `meterMap` (not meter@0 only).
 */
export function ticksFromLogicBar(project: Project, logicBar: number): number {
  const targetBar = fromDisplayBar(Math.max(1, Math.floor(logicBar)));
  let ticks = 0;
  for (let bar = 0; bar < targetBar; bar += 1) {
    const meter = resolveMeterAt(project, ticks);
    ticks += ticksPerBar(meter, project.ppq);
  }
  return ticks;
}

export function canEditKotwice(project: Project): boolean {
  const hasXml = project.assets.some((a) => a.kind === "musicxml");
  return hasXml || scoreAnchors(project).length > 0;
}

export function insertScoreAnchor(
  project: Project,
  atTicks: number,
  scoreBar = 1,
): Project {
  if (!canEditKotwice(project)) return project;
  const snapped = snapTicksToBarStartAlongMeterMap(
    atTicks,
    project.defaultMeter,
    project.meterMap,
    project.ppq,
  );
  const logicBar = logicBarFromTicks(project, snapped);
  const existing = scoreAnchors(project);
  if (existing.some((a) => a.logicBar === logicBar)) {
    return project;
  }
  const anchors = normalizeAnchors({
    anchors: [
      ...existing,
      {
        id: `anchor-${crypto.randomUUID()}`,
        logicBar,
        scoreBar: Math.max(1, Math.floor(scoreBar)),
      },
    ],
  });
  return { ...project, scoreBarMap: { anchors } };
}

export function moveScoreAnchor(
  project: Project,
  anchorId: string,
  atTicks: number,
): Project {
  const snapped = snapTicksToBarStartAlongMeterMap(
    atTicks,
    project.defaultMeter,
    project.meterMap,
    project.ppq,
  );
  const logicBar = logicBarFromTicks(project, snapped);
  const existing = scoreAnchors(project);
  const target = existing.find((a) => a.id === anchorId);
  if (!target) return project;
  if (target.logicBar === logicBar) return project;
  // Occupied bar → no-op (do not let normalizeAnchors silently drop a peer).
  if (existing.some((a) => a.id !== anchorId && a.logicBar === logicBar)) {
    return project;
  }
  const anchors = existing.map((a) =>
    a.id === anchorId ? { ...a, logicBar } : a,
  );
  return {
    ...project,
    scoreBarMap: { anchors: normalizeAnchors({ anchors }) },
  };
}

export function updateScoreAnchor(
  project: Project,
  anchorId: string,
  patch: { logicBar?: number; scoreBar?: number },
): Project {
  const anchors = scoreAnchors(project).map((a) => {
    if (a.id !== anchorId) return a;
    return {
      ...a,
      logicBar:
        patch.logicBar != null
          ? Math.max(1, Math.floor(patch.logicBar))
          : a.logicBar,
      scoreBar:
        patch.scoreBar != null
          ? Math.max(1, Math.floor(patch.scoreBar))
          : a.scoreBar,
    };
  });
  return {
    ...project,
    scoreBarMap: { anchors: normalizeAnchors({ anchors }) },
  };
}

export function deleteScoreAnchor(
  project: Project,
  anchorId: string,
): Project {
  const anchors = scoreAnchors(project).filter((a) => a.id !== anchorId);
  return { ...project, scoreBarMap: { anchors } };
}

export function anchorBarWidthTicks(project: Project, logicBar: number): number {
  const start = ticksFromLogicBar(project, logicBar);
  const meter = resolveMeterAt(project, start);
  return ticksPerBar(meter, project.ppq);
}
