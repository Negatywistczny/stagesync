/**
 * Song bar (transport / logicBar) → MusicXML measure (scoreBar).
 * Port of legacy `score-bar-map.js` — Kotwice lane.
 */

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
