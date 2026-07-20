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
};

export const TransportContext = createContext<TransportContextValue | null>(
  null,
);
