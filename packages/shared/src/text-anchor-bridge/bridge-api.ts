import type { FormaClip, Project, TekstClip } from "../schema.js";
import { DEFAULT_PPQ, ticksPerBar } from "../time.js";
import {
  applyUltrastarImportToProject,
  importUltrastarText,
  suggestGridBpmFromPipeAndFirstVocal,
} from "../ultrastar-import.js";
import {
  placeUsUgBackingAudioClip,
  suggestBeat1MsFromPipeAndGap,
} from "../smart-tempo.js";
import type {
  ApplyUsUgBridgeOptions,
  TextAnchorBridgeOk,
  TextAnchorBridgeOptions,
  TextAnchorBridgeResult,
} from "./types.js";
import { parseUgBridgeSections } from "./ug-parse.js";
import { bridgeUsUgImport } from "./bridge-orchestrator.js";

export type { ApplyUsUgBridgeOptions };

/**
 * Suggest editorial grid BPM from UltraStar wall-clock + first UG pipe section.
 * Pass `beat1Ms` when Audio Start Offset / Beat 1 is known so pre-roll is
 * excluded from the pipe+pickup span (Logic-band seed ~120–123, not ~113).
 * When `beat1Ms` is omitted/0 and the pipe Intro is long, bootstraps a
 * provisional Beat 1 @ 120 BPM so SingStar-style GAP is not counted from 0.
 */
export function suggestGridBpmFromUsUgTexts(
  ultrastarText: string,
  ugText: string,
  options: Pick<TextAnchorBridgeOptions, "meter"> & { beat1Ms?: number } = {},
): number | null {
  const us = importUltrastarText(ultrastarText, { meter: options.meter });
  if (!us.ok) return null;
  const pipeSec = parseUgBridgeSections(ugText).find((s) => s.pipeBarCount > 0);
  if (!pipeSec) return null;
  let beat1Ms = 0;
  if (pipeSec.pipeBarCount >= 12 && us.firstVocalMs > 0) {
    beat1Ms = suggestBeat1MsFromPipeAndGap({
      gapMs: us.firstVocalMs,
      pipeBarCount: pipeSec.pipeBarCount,
      layoutBpm: 120,
      meter: options.meter,
    });
  }
  return suggestGridBpmFromPipeAndFirstVocal({
    pipeBarCount: pipeSec.pipeBarCount,
    firstVocalMs: us.firstVocalMs,
    beat1Ms,
    meter: options.meter,
  });
}

/**
 * Convenience: parse UltraStar + UG strings then bridge.
 * Syllables always wall-clock at place BPM. Default place BPM = UltraStar
 * file metronome (`#BPM/4`). Suggested pipe+GAP BPM is returned for UI only.
 */
export function bridgeUsUgFromTexts(
  ultrastarText: string,
  ugText: string,
  options: TextAnchorBridgeOptions = {},
): TextAnchorBridgeResult {
  const suggested = suggestGridBpmFromUsUgTexts(ultrastarText, ugText, {
    meter: options.meter,
  });
  const placeBpm =
    options.gridBpm != null &&
    Number.isFinite(options.gridBpm) &&
    options.gridBpm > 0
      ? options.gridBpm
      : undefined;

  const us = importUltrastarText(ultrastarText, {
    ppq: options.ppq,
    meter: options.meter,
    contentFloorTicks: options.contentFloorTicks,
    idPrefix: options.idPrefix ? `${options.idPrefix}-us` : "us",
    ...(placeBpm != null ? { gridBpm: placeBpm } : {}),
  });
  if (!us.ok) return us;

  const bridged = bridgeUsUgImport(us, ugText, options);
  if (!bridged.ok) return bridged;
  return {
    ...bridged,
    suggestedGridBpm: suggested,
    ultrastarMetronomeBpm: us.ultrastarMetronomeBpm,
    mp3Hint: us.mp3Hint,
    youtubeVideoId: us.youtubeVideoId,
  };
}

/**
 * Merge bridge result into Project: US tekst/melody/BPM, UG-named Forma (keep
 * Countdown), anchored akordy, MultiPass TempoMap. Optionally places backing
 * audio clip (Smart Tempo).
 */
export function applyUsUgBridgeToProject(
  project: Project,
  bridged: TextAnchorBridgeOk,
  options: ApplyUsUgBridgeOptions = {},
): Project {
  const applyBpm = options.applyBpm !== false;
  const audioRef = options.smartTempoAudio ?? bridged.smartTempoAudio;
  const countdown = project.forma.clips.filter((c) => c.kind === "countdown");
  // sourceSection already align-first from bridge — do not re-annotate geometrically.
  const tekst = bridged.tekst.clips;
  const withUs = applyUltrastarImportToProject(
    project,
    {
      ok: true,
      title: bridged.title,
      artist: bridged.artist,
      metronomeBpm: bridged.metronomeBpm,
      ultrastarBpm: bridged.ultrastarMetronomeBpm * 4,
      ultrastarMetronomeBpm: bridged.ultrastarMetronomeBpm,
      gapMs: 0,
      firstVocalMs: 0,
      mp3Hint: bridged.mp3Hint ?? null,
      videoUrl: null,
      youtubeVideoId: bridged.youtubeVideoId ?? null,
      tekst: { clips: tekst },
      melody: bridged.melody,
      noteCount: bridged.melody.clips.length,
      syllableCount: tekst.reduce((n, c) => n + (c.blocks?.length ?? 0), 0),
      wordCount: bridged.usWordCount,
    },
    { applyBpm: false },
  );
  let next: Project = {
    ...withUs,
    forma: { clips: [...countdown, ...bridged.formaMusic.clips] },
    akordy: bridged.akordy,
    ...(applyBpm
      ? {
          defaultBpm:
            audioRef?.estimatedBpm && audioRef.estimatedBpm > 0
              ? audioRef.estimatedBpm
              : bridged.seedBpm,
          tempoMap:
            audioRef?.tempoMap && audioRef.tempoMap.length > 0
              ? audioRef.tempoMap.map((e, idx) => ({
                  id: e.id ?? `stm-${idx}`,
                  startTicks: e.startTicks,
                  bpm: e.bpm,
                }))
              : bridged.tempoMap.length > 0
                ? bridged.tempoMap
                : [
                    {
                      id: "bridge-tempo-0",
                      startTicks: 0,
                      bpm: bridged.seedBpm,
                    },
                  ],
        }
      : {}),
  };
  // Wizard may pass a synthetic `local-*` id before server upload — skip stub.
  const placeableAsset =
    audioRef?.assetId &&
    !audioRef.assetId.startsWith("local-") &&
    audioRef.durationMs > 0
      ? audioRef
      : null;
  if (placeableAsset) {
    next = placeUsUgBackingAudioClip(next, {
      assetId: placeableAsset.assetId,
      durationMs: placeableAsset.durationMs,
      waveformPeaks: placeableAsset.peaks,
      audioStartOffsetMs: placeableAsset.audioStartOffsetMs ?? 0,
      startTicks: 0,
    });
  }
  return next;
}

/** Annotate tekst clips with sourceSection from forma affinity (onset).
 * Vocal pickups that start in the previous section window still belong to the
 * upcoming section (within one bar before its start).
 * Membership uses each container's own `[start, start+length)` — not next.start.
 *
 * @deprecated Prefer {@link annotateTekstSourceSectionsFromAlign} for US+UG.
 */
export function annotateTekstSourceSections(
  tekstClips: TekstClip[],
  formaMusic: FormaClip[],
  barTicks: number = ticksPerBar({ numerator: 4, denominator: 4 }, DEFAULT_PPQ),
): TekstClip[] {
  const sections = [...formaMusic].sort((a, b) => a.startTicks - b.startTicks);
  return tekstClips.map((clip) => {
    let name: string | undefined;
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i]!;
      const end = s.startTicks + s.lengthTicks;
      if (clip.startTicks >= s.startTicks && clip.startTicks < end) {
        name = s.name;
        break;
      }
    }
    // Pickup: lyric starts just before the next section barline.
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i]!;
      if (
        clip.startTicks < s.startTicks &&
        s.startTicks - clip.startTicks <= barTicks &&
        clip.startTicks + clip.lengthTicks > s.startTicks - barTicks
      ) {
        name = s.name;
        break;
      }
    }
    return name ? { ...clip, sourceSection: name } : clip;
  });
}
