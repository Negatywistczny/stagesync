/**
 * UltraStar / USDX import — merge into Project + tempo map BPM sync.
 */

import type { Project } from "../schema.js";
import type { ApplyUltrastarOptions, UltrastarImportOk } from "./types.js";

/**
 * Sync project tempo with imported metronome BPM: set `defaultBpm` and ensure
 * a tempo-map event at tick 0 carries that BPM (do not leave a stale 120 map).
 */
export function tempoMapWithImportedBpm(
  tempoMap: Project["tempoMap"],
  bpm: number,
): Project["tempoMap"] {
  const atZero = tempoMap.findIndex((e) => e.startTicks === 0);
  if (atZero >= 0) {
    return tempoMap.map((e, i) => (i === atZero ? { ...e, bpm } : e));
  }
  if (tempoMap.length === 0) {
    return [{ id: "us-tempo-0", startTicks: 0, bpm }];
  }
  return [{ id: "us-tempo-0", startTicks: 0, bpm }, ...tempoMap];
}

/**
 * Replace tekst + melody lanes. Keeps forma / akordy / audio / cue.
 * Lyrics must not become Forma section names.
 * When applyBpm (default), updates defaultBpm **and** tempoMap @ tick 0 so
 * GAP/tick placement matches transport (resolveTempoAt reads tempoMap first).
 */
export function applyUltrastarImportToProject(
  project: Project,
  imported: UltrastarImportOk,
  options: ApplyUltrastarOptions = {},
): Project {
  const bpm = imported.metronomeBpm;
  const bpmUpdates =
    options.applyBpm && bpm && bpm > 0
      ? {
          defaultBpm: bpm,
          tempoMap: tempoMapWithImportedBpm(project.tempoMap, bpm),
        }
      : {};
  return {
    ...project,
    ...(imported.title?.trim()
      ? { name: imported.title.trim().slice(0, 200) }
      : {}),
    ...(imported.artist?.trim()
      ? { artist: imported.artist.trim().slice(0, 200) }
      : {}),
    tekst: imported.tekst,
    melody: imported.melody,
    ...bpmUpdates,
  };
}
