/**
 * Client cue banner merge — live session message + timeline cue clips.
 * Pure (no Date.now / performance); clock/tick from caller.
 */

import { ticksPerBar, type TimeSignature } from "./time.js";

export const STAGE_CUE_DEFAULT_LOOKAHEAD_MS = 5000;

export type StageCueBannerRole = "karaoke" | "grid" | "score" | "drums";
export type StageCueBannerPriority = "normal" | "alert";

export type StageCueBannerClip = {
  id: string;
  startTicks: number;
  lengthTicks: number;
  label: string;
};

export type StageCueBannerSession = {
  text: string;
  sentAtMs: number;
  ttlMs: number;
  roles?: StageCueBannerRole[];
  priority?: StageCueBannerPriority;
};

export type StageCueBannerItem = {
  id: string;
  text: string;
  slot: "now" | "upcoming";
  /** Bars until cue start (upcoming only); min 1. */
  barsUntil?: number;
  priority: StageCueBannerPriority;
  source: "session" | "song";
};

function roleMatches(
  activeRoles: readonly string[],
  cueRoles: readonly string[] | undefined,
): boolean {
  if (!cueRoles || cueRoles.length === 0) return true;
  if (activeRoles.length === 0) return true;
  return cueRoles.some((r) => activeRoles.includes(r));
}

function priorityRank(priority: StageCueBannerPriority): number {
  return priority === "alert" ? 0 : 1;
}

function sourceRank(source: StageCueBannerItem["source"]): number {
  return source === "session" ? 0 : 1;
}

type Ranked = StageCueBannerItem & { startRank: number };

function pickBest(items: Ranked[], excludeId?: string): Ranked | null {
  const pool = excludeId ? items.filter((i) => i.id !== excludeId) : items;
  if (pool.length === 0) return null;
  return pool.reduce((best, cur) => {
    const bySource = sourceRank(cur.source) - sourceRank(best.source);
    if (bySource !== 0) return bySource < 0 ? cur : best;
    const byPri = priorityRank(cur.priority) - priorityRank(best.priority);
    if (byPri !== 0) return byPri < 0 ? cur : best;
    return cur.startRank < best.startRank ? cur : best;
  });
}

function lookaheadTicksFromTempo(
  bpm: number,
  ppq: number,
  lookaheadMs: number,
): number {
  const safeBpm = Number.isFinite(bpm) && bpm > 0 ? bpm : 120;
  const ms = Math.max(0, lookaheadMs);
  const beats = Math.max(1, Math.ceil((ms / 60_000) * safeBpm));
  return beats * ppq;
}

/**
 * Resolve at most one `now` + one `upcoming` banner item (v4 cue-display parity).
 * Session live messages always compete for `now` only.
 */
export function resolveStageCueBanner(opts: {
  cueClips: readonly StageCueBannerClip[];
  sessionCue: StageCueBannerSession | null;
  playheadTicks: number;
  bpm: number;
  ppq: number;
  meter: TimeSignature;
  activeRoles: readonly string[];
  lookaheadMs?: number;
}): { now: StageCueBannerItem | null; next: StageCueBannerItem | null } {
  const playhead = Math.max(0, Math.floor(opts.playheadTicks));
  const barTicks = ticksPerBar(opts.meter, opts.ppq);
  const lookahead = lookaheadTicksFromTempo(
    opts.bpm,
    opts.ppq,
    opts.lookaheadMs ?? STAGE_CUE_DEFAULT_LOOKAHEAD_MS,
  );

  const songNow: Ranked[] = [];
  const songUpcoming: Ranked[] = [];

  for (const clip of opts.cueClips) {
    const start = clip.startTicks;
    const end = start + clip.lengthTicks;
    const text = clip.label.trim().slice(0, 200);
    if (!text) continue;
    const base: Ranked = {
      id: `song:${clip.id}`,
      text,
      slot: "now",
      priority: "normal",
      source: "song",
      startRank: start,
    };
    if (start <= playhead && playhead < end) {
      songNow.push({ ...base, slot: "now" });
    } else if (start > playhead && start <= playhead + lookahead) {
      const barsUntil = Math.max(1, Math.ceil((start - playhead) / barTicks));
      songUpcoming.push({
        ...base,
        slot: "upcoming",
        barsUntil,
      });
    }
  }

  const sessionItems: Ranked[] = [];
  if (opts.sessionCue && roleMatches(opts.activeRoles, opts.sessionCue.roles)) {
    const text = opts.sessionCue.text.trim().slice(0, 200);
    if (text) {
      sessionItems.push({
        id: `session:${opts.sessionCue.sentAtMs}`,
        text,
        slot: "now",
        priority: opts.sessionCue.priority === "alert" ? "alert" : "normal",
        source: "session",
        startRank: opts.sessionCue.sentAtMs,
      });
    }
  }

  const now =
    pickBest([
      ...sessionItems,
      ...songNow.filter((c) => c.priority === "alert"),
      ...songNow,
    ]) ?? null;

  const next =
    pickBest(
      [
        ...songUpcoming.filter((c) => c.priority === "alert"),
        ...songUpcoming,
      ],
      now?.id,
    ) ?? null;

  return {
    now: now
      ? {
          id: now.id,
          text: now.text,
          slot: "now",
          priority: now.priority,
          source: now.source,
        }
      : null,
    next: next
      ? {
          id: next.id,
          text: next.text,
          slot: "upcoming",
          barsUntil: next.barsUntil,
          priority: next.priority,
          source: next.source,
        }
      : null,
  };
}

export function stageCueBannerLabel(item: StageCueBannerItem): string {
  if (item.slot === "upcoming") {
    return `ZA ${item.barsUntil ?? 1}`;
  }
  return "TERAZ";
}
