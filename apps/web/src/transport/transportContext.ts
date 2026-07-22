import { createContext } from "react";
import type {
  TransportLoopBody,
  TransportPlayBody,
  TransportState,
} from "@stagesync/shared";

export type WsStatus = "connecting" | "connected" | "disconnected";

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
  /** Latest session cue (compat); prefer `stageCues` for multi-message SSOT. */
  stageCue: StageCue | null;
  /** Active session cues from WS snapshot / upsert / dismiss. */
  stageCues: StageCue[];
  /** Live Desk (team transpose / sync-lead / remote edit). */
  liveDesk: LiveDeskState;
  /** Announce Client identity to Admin presence (WS). */
  announcePresence: (payload: {
    displayName: string | null;
    roles: string[];
  }) => void;
};

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

export const DEFAULT_LIVE_DESK: LiveDeskState = {
  transpositionSemitones: 0,
  syncLeadMs: 200,
  clientEditEnabled: true,
};

export const TransportContext = createContext<TransportContextValue | null>(
  null,
);
