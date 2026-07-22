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
  stageCue: StageCue | null;
  /** Announce Client identity to Admin presence (WS). */
  announcePresence: (payload: {
    displayName: string | null;
    roles: string[];
  }) => void;
};

export type StageCue = {
  text: string;
  ttlMs: number;
  sentAtMs: number;
  roles?: Array<"karaoke" | "grid" | "score" | "drums">;
  priority?: "normal" | "alert";
};

export const TransportContext = createContext<TransportContextValue | null>(
  null,
);
