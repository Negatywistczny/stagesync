/**
 * Kotwice (scoreBarMap) mutations for Timeline.
 */

import {
  bbtToTicks,
  fromDisplayBar,
  normalizeAnchors,
  resolveMeterAt,
  snapTicksToBarStart,
  ticksPerBar,
  ticksToBbt,
  toDisplayBar,
  type Project,
  type ScoreBarAnchor,
} from "@stagesync/shared";

export function scoreAnchors(project: Project): ScoreBarAnchor[] {
  return normalizeAnchors(project.scoreBarMap ?? { anchors: [] });
}

export function logicBarFromTicks(project: Project, ticks: number): number {
  const meter = resolveMeterAt(project, ticks);
  const bbt = ticksToBbt(ticks, meter, project.ppq);
  return Math.max(1, toDisplayBar(bbt.bar));
}

export function ticksFromLogicBar(project: Project, logicBar: number): number {
  const meter = resolveMeterAt(project, 0);
  return bbtToTicks(fromDisplayBar(logicBar), 1, 0, meter, project.ppq);
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
  const meter = resolveMeterAt(project, atTicks);
  const snapped = snapTicksToBarStart(atTicks, meter, project.ppq);
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
  const meter = resolveMeterAt(project, atTicks);
  const snapped = snapTicksToBarStart(atTicks, meter, project.ppq);
  const logicBar = logicBarFromTicks(project, snapped);
  const anchors = scoreAnchors(project).map((a) =>
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
