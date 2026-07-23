/**
 * Pure transport helpers — no React / DOM.
 * Provider stays a thin adapter over these reducers.
 */

import type { TransportAnchor, TransportState } from "@stagesync/shared";
import type { LiveDeskState, StageCue } from "./transportContext.js";

const MAX_LATENCY_MS = 60_000;

export function formatTransportError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : fallback;
  return message.slice(0, 500);
}

export function toTransportAnchor(state: TransportState): TransportAnchor {
  return {
    positionTicks: state.positionTicks,
    bpm: state.bpm,
    timeSignature: state.timeSignature,
    ppq: state.ppq,
  };
}

/** v4-style EMA of one-way delay from wall-clock `sentAtMs`. */
export function noteLatencySample(
  prev: number,
  sentAtMs: number,
  nowMs: number = Date.now(),
): number {
  const sample = Math.min(MAX_LATENCY_MS, Math.max(0, nowMs - sentAtMs));
  if (!prev) return sample;
  return Math.min(MAX_LATENCY_MS, Math.round(prev * 0.82 + sample * 0.18));
}

/** Drop out-of-order ticks when serverTimeMs goes backwards. */
export function shouldAcceptServerTick(
  serverTimeMs: number | undefined,
  lastServerTimeMs: number,
): boolean {
  if (serverTimeMs === undefined) return true;
  return serverTimeMs >= lastServerTimeMs;
}

export function transportWsUrl(location: {
  protocol: string;
  host: string;
}): string {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}/ws/transport`;
}

export function upsertStageCue(
  prev: StageCue[],
  nextCue: StageCue,
): StageCue[] {
  if (nextCue.id) {
    const idx = prev.findIndex((c) => c.id === nextCue.id);
    if (idx >= 0) {
      const copy = [...prev];
      copy[idx] = nextCue;
      return copy;
    }
  }
  return [...prev, nextCue];
}

export function dismissStageCues(
  prev: StageCue[],
  dismiss: { id?: string; clearAll?: boolean },
): { cues: StageCue[]; latest: StageCue | null } {
  if (dismiss.clearAll) {
    return { cues: [], latest: null };
  }
  if (!dismiss.id) {
    return {
      cues: prev,
      latest: prev.length > 0 ? prev[prev.length - 1]! : null,
    };
  }
  const cues = prev.filter((c) => c.id !== dismiss.id);
  return {
    cues,
    latest: cues.length > 0 ? cues[cues.length - 1]! : null,
  };
}

export function liveDeskFromPayload(desk: {
  transpositionSemitones: number;
  syncLeadMs: number;
  clientEditEnabled: boolean;
}): LiveDeskState {
  return {
    transpositionSemitones: desk.transpositionSemitones,
    syncLeadMs: desk.syncLeadMs,
    clientEditEnabled: desk.clientEditEnabled,
  };
}

export function stageCueFromWs(cue: {
  id?: string;
  text: string;
  ttlMs: number;
  sentAtMs: number;
  roles?: StageCue["roles"];
  priority?: StageCue["priority"];
}): StageCue {
  return {
    id: cue.id,
    text: cue.text.slice(0, 200),
    ttlMs: cue.ttlMs,
    sentAtMs: cue.sentAtMs,
    roles: cue.roles,
    priority: cue.priority,
  };
}
