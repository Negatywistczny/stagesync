import type { LogBuffer } from "../../log-buffer.js";
import type { Lifecycle } from "../../lifecycle.js";
import type { TransportEngine } from "../../transport/engine.js";

export type SystemRouterDeps = {
  logBuffer: LogBuffer;
  lifecycle?: Lifecycle;
  port?: number;
  version?: string;
  dataDir?: string;
  /** When set: promote while PLAYING → PAUSE (ADR 0017 §3). */
  transport?: TransportEngine;
};

export type LatestReleaseResult = {
  latest: string | null;
  /** Operator-facing reason when `latest` is null; null on success. */
  error: string | null;
};
