/**
 * MultiPassTempoSolver — Pass 1–5 orchestration.
 */

import type { TempoEvent } from "../project/schema.js";
import { DEFAULT_PPQ, ticksPerBar } from "../time-tempo/time.js";
import {
  layoutContiguousFormaPlans,
  pristineBarsFromMsSpan,
  sectionBeat1Ms,
} from "./anacrusis.js";
import {
  resolveAnchorTargetTicks,
  tempoEventsFromMsTickAnchors,
} from "./anchors.js";
import {
  DEFAULT_METER,
  TEMPO_SOLVER_HIGH_WEIGHT,
  TEMPO_SOLVER_PRUNE_DELTA_BPM,
  TEMPO_SOLVER_SECTION_WEIGHT,
} from "./constants.js";
import {
  applySeedMetronomeFallback,
  computeSeedBpmFromAnchors,
} from "./seed.js";
import type {
  MultiPassTempoSolverInput,
  MultiPassTempoSolverResult,
  TempoSolverAnchor,
  TempoSolverSectionPlan,
} from "./types.js";

/**
 * Layout Forma tick walls (S3) and sparse TempoMap from (ms, targetTick).
 * Solver does not later move `startTicks` / `lengthTicks`.
 */
export function runMultiPassTempoSolver(
  input: MultiPassTempoSolverInput,
): MultiPassTempoSolverResult {
  const meter = input.meter ?? DEFAULT_METER;
  const ppq = input.ppq ?? DEFAULT_PPQ;
  const barTicks = ticksPerBar(meter, ppq);
  const floor = input.contentFloorTicks ?? 0;
  const prefix = input.idPrefix ?? "tempo";
  const warnings: string[] = [];

  const seedBpm = applySeedMetronomeFallback(
    computeSeedBpmFromAnchors(input.anchors, input.fallbackBpm, meter),
    input.referenceMetronomeBpm,
  );

  const plans: TempoSolverSectionPlan[] = [];
  for (let si = 0; si < input.sections.length; si++) {
    const sec = input.sections[si]!;
    const fromPipe = sec.pipeBarCount > 0;
    const vr = sec.vocalMsRange;
    let startMs = 0;
    let endMs = 0;
    let pristineBars: number;

    if (fromPipe) {
      pristineBars = Math.max(1, sec.pipeBarCount);
      startMs = vr?.startMs ?? 0;
      endMs = vr?.endMs ?? startMs;
    } else if (vr) {
      const accents = input.anchors
        .filter(
          (a) =>
            a.sectionIndex === si &&
            a.weight >= TEMPO_SOLVER_HIGH_WEIGHT &&
            a.kind !== "instrumental" &&
            a.kind !== "section" &&
            a.ms >= vr.startMs &&
            a.ms <= vr.endMs,
        )
        .sort((a, b) => a.ms - b.ms);
      const accent = accents[0];
      startMs = sectionBeat1Ms(
        vr.startMs,
        vr.endMs,
        seedBpm,
        meter,
        ppq,
        accent?.ms ?? null,
      );
      endMs = Math.max(startMs, vr.endMs);
      // Forma length SSOT when provided (US walls / pipe / lyric fallback).
      if (sec.structuralBars != null && sec.structuralBars > 0) {
        pristineBars = Math.max(1, Math.trunc(sec.structuralBars));
      } else {
        pristineBars = pristineBarsFromMsSpan(
          startMs,
          endMs,
          seedBpm,
          meter,
          ppq,
        );
        let structBars = 1;
        for (const a of input.anchors) {
          if (a.sectionIndex !== si || a.barOffset == null) continue;
          structBars = Math.max(structBars, Math.trunc(a.barOffset) + 1);
        }
        pristineBars = Math.max(pristineBars, structBars);
      }
    } else {
      // Instrumental without pipe: UG structural bars / lyric fallback.
      pristineBars =
        sec.structuralBars != null && sec.structuralBars > 0
          ? Math.max(1, Math.trunc(sec.structuralBars))
          : 1;
      warnings.push(
        `Sekcja „${sec.name}” bez wokalu US — długość Formy z przybliżenia strukturalnego.`,
      );
    }

    plans.push({
      sectionIndex: si,
      name: sec.name,
      startMs,
      endMs,
      pristineBars: Math.max(1, pristineBars),
      fromPipe,
      startTicks: 0,
      lengthTicks: 0,
    });
  }

  const layoutBpm =
    input.layoutBpm != null &&
    Number.isFinite(input.layoutBpm) &&
    input.layoutBpm > 0
      ? input.layoutBpm
      : seedBpm;

  layoutContiguousFormaPlans(
    plans,
    input.sections,
    floor,
    barTicks,
    layoutBpm,
    meter,
    ppq,
  );

  // Lock instrumental / pipe wall-clock end to the next section Beat 1 so
  // Verse Forma start aligns with the first accent in the recording.
  for (let i = 0; i < plans.length; i++) {
    const p = plans[i]!;
    const next = plans[i + 1];
    if (next && next.startMs > p.startMs) {
      if (input.sections[i]!.vocalMsRange == null || p.fromPipe) {
        if (p.endMs <= p.startMs) p.endMs = next.startMs;
        else p.endMs = Math.max(p.endMs, next.startMs);
      } else {
        p.endMs = Math.max(p.startMs, p.endMs);
      }
    }
  }

  // TempoMap = exact BPM between Forma section walls only.
  // Locks first vocal ms → Verse Beat 1 (tekst↔MP3↔Forma). Phrase/chord US
  // ms stay orientational for bar counts — not hard tempo kinks (no 97→159).
  const enriched: TempoSolverAnchor[] = [];
  for (let i = 0; i < plans.length; i++) {
    const p = plans[i]!;
    const next = plans[i + 1];
    const wallEndMs =
      next && next.startMs > p.startMs
        ? next.startMs
        : Math.max(p.startMs, p.endMs);
    enriched.push({
      ms: p.startMs,
      sectionIndex: i,
      kind: "section",
      weight: TEMPO_SOLVER_SECTION_WEIGHT,
      targetTick: p.startTicks,
    });
    if (wallEndMs > p.startMs) {
      enriched.push({
        ms: wallEndMs,
        sectionIndex: i,
        kind: "section",
        weight: TEMPO_SOLVER_SECTION_WEIGHT,
        targetTick: p.startTicks + p.lengthTicks,
      });
    }
  }

  const msTick = resolveAnchorTargetTicks(enriched, plans, barTicks);
  const rawEvents = tempoEventsFromMsTickAnchors(
    msTick,
    floor,
    seedBpm,
    meter,
    ppq,
    barTicks,
    { soft: false },
  );

  if (rawEvents.length === 0 || rawEvents[0]!.startTicks > floor) {
    rawEvents.unshift({ startTicks: floor, bpm: seedBpm });
  } else {
    rawEvents[0] = { startTicks: floor, bpm: rawEvents[0]!.bpm };
  }

  rawEvents.sort((a, b) => a.startTicks - b.startTicks);
  const dedup: { startTicks: number; bpm: number }[] = [];
  for (const ev of rawEvents) {
    const last = dedup[dedup.length - 1];
    if (last && last.startTicks === ev.startTicks) {
      last.bpm = ev.bpm;
    } else {
      dedup.push({ ...ev });
    }
  }

  // Soft-prune near-identical BPM at consecutive ticks (map stays sparse).
  const pruned: TempoEvent[] = [];
  for (const ev of dedup) {
    const last = pruned[pruned.length - 1];
    if (last && ev.startTicks <= last.startTicks) continue;
    if (last && Math.abs(ev.bpm - last.bpm) <= TEMPO_SOLVER_PRUNE_DELTA_BPM) {
      continue;
    }
    pruned.push({
      id: `${prefix}-te-${pruned.length + 1}`,
      startTicks: ev.startTicks,
      bpm: ev.bpm,
    });
  }
  if (pruned.length === 0) {
    pruned.push({ id: `${prefix}-te-1`, startTicks: floor, bpm: seedBpm });
  }

  const tempoNodes = plans.map((p) => ({
    wallMs: Math.max(0, p.startMs),
    targetTick: p.startTicks,
  }));
  if (plans.length > 0) {
    const last = plans[plans.length - 1]!;
    tempoNodes.push({
      wallMs: Math.max(0, last.endMs),
      targetTick: last.startTicks + last.lengthTicks,
    });
  }

  if (input.audioDurationMs != null && input.audioDurationMs > 0) {
    const lastWall = tempoNodes[tempoNodes.length - 1]?.wallMs ?? 0;
    if (lastWall > input.audioDurationMs) {
      warnings.push(
        `Mapa tempa (${Math.round(lastWall / 1000)}s) przekracza długość audio (${Math.round(input.audioDurationMs / 1000)}s).`,
      );
    }
  }

  return {
    seedBpm,
    tempoMap: pruned,
    sections: plans,
    warnings,
    tempoNodes,
  };
}
