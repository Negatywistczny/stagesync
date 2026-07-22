/**
 * Song bar (transport / logicBar) ↔ MusicXML measure (scoreBar).
 * Port of legacy `score-bar-map.js` — Kotwice lane (+ reverse for click-to-seek).
 */

import type { Project } from "./schema.js";
import { resolveMeterAt } from "./project-resolve.js";
import { fromDisplayBar, ticksPerBar } from "./time.js";

export type ScoreBarAnchorLike = {
  id?: string;
  logicBar?: unknown;
  songBar?: unknown;
  transportBar?: unknown;
  scoreBar?: unknown;
};

export type ScoreBarMapLike = {
  anchors?: ScoreBarAnchorLike[];
};

export type ScoreBarToSongBarOptions = {
  /** Prefer candidate closest to this song bar (repeats / D.S. resets). */
  nearSongBar?: number;
};

export const DEFAULT_SCORE_ANCHORS = [
  { logicBar: 3, scoreBar: 1 },
] as const;

function readLogicBar(anchor: ScoreBarAnchorLike): number {
  const raw = anchor.logicBar ?? anchor.songBar ?? anchor.transportBar;
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

function readScoreBar(anchor: ScoreBarAnchorLike): number {
  const n = Math.floor(Number(anchor.scoreBar));
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export type NormalizedScoreAnchor = {
  id: string;
  logicBar: number;
  scoreBar: number;
};

/** Sort + drop duplicate logicBar; assign stable ids when missing. */
export function normalizeAnchors(
  map: ScoreBarMapLike | ScoreBarAnchorLike[] | null | undefined,
): NormalizedScoreAnchor[] {
  const raw = Array.isArray(map)
    ? map
    : Array.isArray(map?.anchors)
      ? map.anchors
      : [];
  if (raw.length === 0) return [];

  const limited = raw.length > 256 ? raw.slice(0, 256) : raw;

  const anchors = limited
    .map((anchor, i) => ({
      id:
        typeof anchor.id === "string" && anchor.id.length > 0
          ? anchor.id
          : `anchor-${i}`,
      logicBar: readLogicBar(anchor),
      scoreBar: readScoreBar(anchor),
    }))
    .sort((a, b) => a.logicBar - b.logicBar);

  return anchors
    .filter(
      (anchor, index) =>
        index === 0 || anchor.logicBar > anchors[index - 1]!.logicBar,
    )
    .slice(0, 64);
}

export function normalizeMap(
  map: ScoreBarMapLike | null | undefined,
): { anchors: NormalizedScoreAnchor[] } | null {
  const anchors = normalizeAnchors(map);
  return anchors.length ? { anchors } : null;
}

/** Transport song bar → MusicXML measure (1:1 offset from active kotwica). */
export function songBarToScoreBar(
  songBar: number | string,
  map: ScoreBarMapLike | null | undefined,
): number {
  const song = Math.max(1, Math.floor(Number(songBar)) || 1);
  const anchors = normalizeAnchors(map);
  if (!anchors.length) return song;

  if (song <= anchors[0]!.logicBar) return anchors[0]!.scoreBar;

  let active = anchors[0]!;
  for (let i = 1; i < anchors.length; i++) {
    if (anchors[i]!.logicBar > song) break;
    active = anchors[i]!;
  }

  return Math.max(1, active.scoreBar + (song - active.logicBar));
}

/** @deprecated Prefer songBarToScoreBar. */
export function logicBarToScoreBar(
  logicBar: number | string,
  map: ScoreBarMapLike | null | undefined,
): number {
  return songBarToScoreBar(logicBar, map);
}

/**
 * MusicXML measure → transport song bar (inverse of `songBarToScoreBar`).
 * When kotwice reset `scoreBar` (powtórzenie / D.S.), multiple song bars may
 * map to the same measure — prefer the earliest, or closest to `nearSongBar`.
 */
export function scoreBarToSongBar(
  scoreBar: number | string,
  map: ScoreBarMapLike | null | undefined,
  options?: ScoreBarToSongBarOptions,
): number {
  const score = Math.max(1, Math.floor(Number(scoreBar)) || 1);
  const anchors = normalizeAnchors(map);
  if (!anchors.length) return score;

  const candidates: number[] = [];

  for (let i = 0; i < anchors.length; i++) {
    const active = anchors[i]!;
    const next = anchors[i + 1];
    const minScore = active.scoreBar;
    const maxScore = next
      ? active.scoreBar + (next.logicBar - 1 - active.logicBar)
      : Number.POSITIVE_INFINITY;

    if (score < minScore || score > maxScore) continue;

    const song = active.logicBar + (score - active.scoreBar);
    if (next && song >= next.logicBar) continue;
    candidates.push(song);
  }

  if (!candidates.length) return score;

  const near = options?.nearSongBar;
  if (near != null && Number.isFinite(near)) {
    let best = candidates[0]!;
    let bestDist = Math.abs(best - near);
    for (let i = 1; i < candidates.length; i++) {
      const c = candidates[i]!;
      const d = Math.abs(c - near);
      if (d < bestDist || (d === bestDist && c < best)) {
        best = c;
        bestDist = d;
      }
    }
    return best;
  }

  return candidates[0]!;
}

/**
 * MusicXML measure → tick at song-bar start (walks `meterMap`).
 */
export function ticksFromScoreBar(
  project: Pick<Project, "meterMap" | "defaultMeter" | "ppq" | "scoreBarMap">,
  scoreBar: number,
  options?: ScoreBarToSongBarOptions,
): number {
  const songBar = scoreBarToSongBar(scoreBar, project.scoreBarMap, options);
  const targetBar = fromDisplayBar(Math.max(1, Math.floor(songBar)));
  let ticks = 0;
  for (let bar = 0; bar < targetBar; bar += 1) {
    ticks += ticksPerBar(resolveMeterAt(project, ticks), project.ppq);
  }
  return ticks;
}
