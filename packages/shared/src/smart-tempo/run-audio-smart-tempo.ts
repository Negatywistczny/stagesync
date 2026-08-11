import { DEFAULT_PPQ } from "../time-tempo/time.js";
import { SMART_TEMPO_MAX_BEATS, SMART_TEMPO_MAX_GRID_MS } from "./constants.js";
import { msPerBarAtBpm } from "./beat1-align.js";
import {
  extendBeatGridToDuration,
  medianBpmFromBeatMs,
  preferAudioTempoSeed,
  refineBeatGridWithOnsets,
  sanitizeBeatGridIbis,
  selfConsistentScaleBeatGrid,
} from "./beat-grid.js";
import {
  tempoNodesAtBarBoundaries,
  tempoNodesFromBeatGrid,
} from "./tempo-nodes.js";
import { tempoMapFromTempoNodes } from "./tempo-map.js";
import type { AudioSmartTempoInput, AudioSmartTempoResult } from "./types.js";

/**
 * Audio-driven Smart Tempo: build TempoMap ONLY from precomputed beat grid.
 * US / UG must not author tempo — they snap to this map downstream.
 */
export function runAudioDrivenSmartTempo(
  input: AudioSmartTempoInput,
): AudioSmartTempoResult {
  const meter = input.meter ?? { numerator: 4, denominator: 4 };
  const ppq = input.ppq ?? DEFAULT_PPQ;
  const floor = input.floorTicks ?? 0;
  const prefix = input.idPrefix ?? "stm";
  const offset = Math.max(0, input.audioStartOffsetMs ?? 0);
  const warnings: string[] = [];

  /** Editorial lock BPM (pipe+GAP) — anchors GAP→ticks like PO structure. */
  const lockBpm =
    input.fallbackBpm != null && input.fallbackBpm > 0
      ? input.fallbackBpm
      : input.analysis.estimatedBpm > 0
        ? input.analysis.estimatedBpm
        : 120;

  const gridBpm =
    input.analysis.estimatedBpm > 0 ? input.analysis.estimatedBpm : lockBpm;

  const cameFromViterbi = input.analysis.beatMs.length > 0;
  let beatMs = input.analysis.beatMs.slice(0, SMART_TEMPO_MAX_BEATS);
  if (beatMs.length === 0 && input.analysis.onsetsMs.length > 0) {
    beatMs = input.analysis.onsetsMs.slice(0, SMART_TEMPO_MAX_BEATS);
    warnings.push(
      "Brak siatki beatów — użyto samych transientów (rzadsza mapa tempa).",
    );
  }
  if (beatMs.length === 0) {
    const barMs = msPerBarAtBpm(lockBpm, meter, ppq);
    const gridMs = Math.min(
      Math.max(1, input.durationMs),
      SMART_TEMPO_MAX_GRID_MS,
    );
    const bars = Math.max(1, Math.ceil(gridMs / barMs));
    const beatCount = Math.min(bars * 4 + 1, SMART_TEMPO_MAX_BEATS);
    beatMs = Array.from({ length: beatCount }, (_, i) =>
      Math.round(i * (barMs / 4)),
    );
    warnings.push(
      "Nie wykryto beatów w audio — mapa tempa z BPM kotwicy (sprawdź Beat Mapper).",
    );
  }

  if (input.durationMs > 0) {
    const lastBeat = beatMs[beatMs.length - 1] ?? 0;
    // Extend at lock BPM when available so a low analysis period does not
    // pad the tail with systematically slow beats.
    const extendBpm = lockBpm > 0 ? lockBpm : gridBpm;
    const needMs = Math.max(
      input.durationMs,
      offset + msPerBarAtBpm(extendBpm, meter, ppq),
    );
    if (lastBeat + msPerBarAtBpm(extendBpm, meter, ppq) * 0.5 < needMs) {
      beatMs = extendBeatGridToDuration(
        beatMs,
        needMs,
        extendBpm,
        SMART_TEMPO_MAX_BEATS,
      );
    }
  }

  if (!cameFromViterbi) {
    const refineBpm = lockBpm > 0 ? lockBpm : gridBpm;
    beatMs = refineBeatGridWithOnsets(
      beatMs,
      input.analysis.onsetsMs,
      refineBpm,
      meter,
      ppq,
    );
    beatMs = selfConsistentScaleBeatGrid(beatMs, input.analysis.onsetsMs);
  }

  // Prefer median IBI from the grid — more stable than a single AC peak.
  const medianBpm = medianBpmFromBeatMs(
    beatMs.filter((ms) => ms >= offset - 1),
  );
  // Adapt SSOT: seed from median IBI (analysis only when median missing).
  // fallbackBpm is a last resort / soft half-time octave — never a pipe+GAP lock.
  const seedBpm = preferAudioTempoSeed(gridBpm, lockBpm, medianBpm);

  // Keep Viterbi beat grid timing as detected from actual audio onsets.

  // Drop double-time IBI blips before sparsify — quiet 1–2 bar nodes would
  // otherwise average a single short interval into a multi-BPM Adapt jump.
  beatMs = sanitizeBeatGridIbis(beatMs, seedBpm);

  const rawDense = tempoNodesFromBeatGrid(
    beatMs,
    offset,
    seedBpm,
    floor,
    meter,
    ppq,
  );
  const denseNodes = rawDense.filter((n, i) => {
    if (i === 0) return true;
    const prev = rawDense[i - 1]!;
    return n.wallMs - prev.wallMs >= 200 || n.targetTick === prev.targetTick;
  });
  const tempoNodes = tempoNodesAtBarBoundaries(
    beatMs,
    offset,
    seedBpm,
    floor,
    meter,
    ppq,
  );
  const tempoMap = tempoMapFromTempoNodes(
    tempoNodes.length > 0 ? tempoNodes : denseNodes,
    seedBpm,
    floor,
    meter,
    ppq,
    prefix,
    {
      audioDurationMs: input.durationMs > 0 ? input.durationMs : undefined,
    },
  );

  const lastWall = beatMs[beatMs.length - 1] ?? 0;
  if (
    input.durationMs > 0 &&
    lastWall > input.durationMs + msPerBarAtBpm(seedBpm, meter, ppq)
  ) {
    warnings.push(
      `Mapa tempa (${Math.round(lastWall / 1000)}s) przekracza długość audio (${Math.round(input.durationMs / 1000)}s).`,
    );
  }

  return {
    seedBpm,
    tempoMap,
    tempoNodes,
    beatMs,
    warnings,
  };
}
