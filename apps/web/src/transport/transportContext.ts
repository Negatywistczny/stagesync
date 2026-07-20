import { createContext } from "react";
import type { TransportPlayBody, TransportState } from "@stagesync/shared";

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
  stageCue: StageCue | null;
};

export type StageCue = {
  text: string;
  ttlMs: number;
  sentAtMs: number;
};

export const TransportContext = createContext<TransportContextValue | null>(
  null,
);
