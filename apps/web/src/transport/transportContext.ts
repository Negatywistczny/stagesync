import { createContext } from "react";
import type {
  TempoMapProject,
  TransportLoopBody,
  TransportPlayBody,
  TransportState,
} from "@stagesync/shared";

export type WsStatus = "connecting" | "connected" | "disconnected";

export type StageCue = {
  id?: string;
  text: string;
  ttlMs: number;
  sentAtMs: number;
  roles?: Array<"karaoke" | "grid" | "score" | "drums">;
  priority?: "normal" | "alert";
};

export type LiveDeskState = {
  transpositionSemitones: number;
  syncLeadMs: number;
  clientEditEnabled: boolean;
};

/** Lightweight setlist chrome snapshot from WS (not full SetlistView items). */
export type SetlistSnapshotState = {
  projectIds: string[];
  enabled: boolean;
  autoAdvanceEnabled: boolean;
  currentIndex: number;
  next: { id: string; name: string } | null;
  sentAtMs: number;
};

export const DEFAULT_LIVE_DESK: LiveDeskState = {
  transpositionSemitones: 0,
  syncLeadMs: 200,
  clientEditEnabled: true,
};

export const DEFAULT_SETLIST_SNAPSHOT: SetlistSnapshotState = {
  projectIds: [],
  enabled: false,
  autoAdvanceEnabled: false,
  currentIndex: -1,
  next: null,
  sentAtMs: 0,
};

export type TransportContextValue = {
  state: TransportState;
  displayTicks: number;
  wsStatus: WsStatus;
  /** Smoothed one-way transport latency from tick `sentAtMs` (null until first sample). */
  latencyMs: number | null;
  commandPending: boolean;
  error: string | null;
  play: (body?: TransportPlayBody) => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  seek: (positionTicks: number) => Promise<void>;
  setLoop: (body: TransportLoopBody) => Promise<void>;
  /**
   * Project tempo/meter maps for soft-clock AlongMap between server ticks.
   * Pass `null` to fall back to constant tick BPM.
   */
  setSoftClockTempoMaps: (maps: TempoMapProject | null) => void;
  /** Latest session cue (compat); prefer `stageCues` for multi-message SSOT. */
  stageCue: StageCue | null;
  /** Active session cues from WS snapshot / upsert / dismiss. */
  stageCues: StageCue[];
  /** Live Desk (team transpose / sync-lead / remote edit). */
  liveDesk: LiveDeskState;
  /** Setlist neighbors pushed over WS after Admin edits. */
  setlistSnapshot: SetlistSnapshotState;
  /** Announce Client identity to Admin presence (WS). */
  announcePresence: (payload: {
    displayName: string | null;
    roles: string[];
  }) => void;
};

export const TransportContext = createContext<TransportContextValue | null>(
  null,
);
