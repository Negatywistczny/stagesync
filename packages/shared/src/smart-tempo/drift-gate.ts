import { DEFAULT_PPQ } from "../time.js";
import { msPerBarAtBpm } from "./beat1-align.js";
import type { ApplyDriftGateOptions, DriftGateResult } from "./types.js";

/**
 * Drift Gate (≤ 1 bar @ seedBpm): micro-jitter from vocal expression is ignored;
 * larger drift inserts a Tempo Node or ramp between boundaries.
 */
export function evaluateDriftGate(
  observedMs: number,
  expectedMs: number,
  opts: ApplyDriftGateOptions,
): DriftGateResult {
  const meter = opts.meter ?? { numerator: 4, denominator: 4 };
  const ppq = opts.ppq ?? DEFAULT_PPQ;
  const deltaMs = observedMs - expectedMs;
  const threshold = msPerBarAtBpm(opts.seedBpm, meter, ppq);
  if (Math.abs(deltaMs) <= threshold) {
    return { action: "ignore", deltaMs };
  }
  if (opts.gradual) {
    return {
      action: "ramp",
      deltaMs,
      start: { wallMs: expectedMs, targetTick: 0 },
      end: { wallMs: observedMs, targetTick: 0 },
    };
  }
  return {
    action: "node",
    deltaMs,
    wallMs: observedMs,
    targetTick: 0,
  };
}
