import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { Project } from "@stagesync/shared";
import { wrapDisplayTicks } from "@stagesync/shared";
import {
  allowAudioPlayback,
  clearAudioBufferCache,
  getFailedAudioAssetIds,
  loadAudioBuffer,
  stopAudioPlayback,
  syncAudioPlayback,
} from "@lib/audio/audioPlayback.js";
import { usableLoopRange } from "@lib/timeline/timelineLocator.js";
import { computeWaveformFromAudioBuffer } from "@lib/audio/waveformPeaks.js";
import { applyDecodedAudioMeta } from "@lib/audio/audioLaneEdit.js";
import {
  ensureAudioTrackVisibility,
  type TrackVisibilityMap,
} from "@lib/timeline/timelineTracks.js";

export type UseTimelineAudioEngineSyncOpts = {
  projectId: string | null | undefined;
  draftProject: Project | null;
  setDraftProject: Dispatch<SetStateAction<Project | null>>;
  setTrackVisibility: Dispatch<SetStateAction<TrackVisibilityMap>>;
  setFailedAudioAssetIds: Dispatch<SetStateAction<string[]>>;
  setSoftClockTempoMaps: (maps: any) => void;
  state: {
    playing: boolean;
    displayTicks?: number;
    loop?: any;
    bpm: number;
    ppq: number;
  };
  displayTicks: number;
  loopOn: boolean;
  soloAudioTrackIds: string[];
  soloBusIds: string[];
  latencyCompMs: number;
};

export function useTimelineAudioEngineSync({
  projectId,
  draftProject,
  setDraftProject,
  setTrackVisibility,
  setFailedAudioAssetIds,
  setSoftClockTempoMaps,
  state,
  displayTicks,
  loopOn,
  soloAudioTrackIds,
  soloBusIds,
  latencyCompMs,
}: UseTimelineAudioEngineSyncOpts) {
  // Soft-clock AlongMap — same TempoMap math as server engine / audio (P3).
  useEffect(() => {
    if (!draftProject) {
      setSoftClockTempoMaps(null);
      return;
    }
    setSoftClockTempoMaps({
      defaultBpm: draftProject.defaultBpm,
      defaultMeter: draftProject.defaultMeter,
      tempoMap: draftProject.tempoMap,
      meterMap: draftProject.meterMap,
      ppq: draftProject.ppq,
    });
    return () => setSoftClockTempoMaps(null);
  }, [draftProject, setSoftClockTempoMaps]);

  // WebAudio clip playback — sync to server ticks (ADR 0008 / 0002).
  useEffect(() => {
    if (!projectId || !draftProject) {
      stopAudioPlayback();
      return;
    }
    if (!state.playing) {
      // SSOT paused/stopped — clear local suppress from Pause/Stop click RTT.
      allowAudioPlayback();
      stopAudioPlayback();
      return;
    }
    let audioTicks = displayTicks;
    const loopRange = usableLoopRange(state.loop);
    if (loopOn && loopRange) {
      audioTicks = wrapDisplayTicks(audioTicks, {
        enabled: true,
        startTicks: loopRange.startTicks,
        endTicks: loopRange.endTicks,
      });
    }
    syncAudioPlayback(projectId, {
      project: draftProject,
      playing: state.playing,
      displayTicks: audioTicks,
      loopEnabled: loopOn,
      soloTrackIds: soloAudioTrackIds,
      soloBusIds,
    });
  }, [
    projectId,
    draftProject,
    state.playing,
    displayTicks,
    state.bpm,
    state.ppq,
    state.loop,
    latencyCompMs,
    loopOn,
    soloAudioTrackIds,
    soloBusIds,
  ]);

  useEffect(() => {
    return () => {
      stopAudioPlayback();
      if (projectId) clearAudioBufferCache(projectId);
    };
  }, [projectId]);

  const audioAssetDecodeKey =
    draftProject?.assets
      .filter((a) => a.kind === "audio")
      .map(
        (a) => `${a.id}:${a.durationMs ?? 0}:${a.waveformPeaks?.length ?? 0}`,
      )
      .join("|") ?? "";

  // Decode assets missing duration/peaks (on-demand waveform).
  useEffect(() => {
    if (!projectId || !draftProject) return;
    let cancelled = false;
    const missing = draftProject.assets.filter(
      (a) =>
        a.kind === "audio" &&
        (a.durationMs == null || !a.waveformPeaks?.length),
    );
    if (!missing.length) return;
    const snapshot = draftProject;
    void (async () => {
      let project = snapshot;
      let changed = false;
      for (const asset of missing) {
        if (cancelled) return;
        const buf = await loadAudioBuffer(projectId, asset.id, undefined, {
          cache: false,
        });
        if (cancelled) return;
        setFailedAudioAssetIds(getFailedAudioAssetIds(projectId));
        if (!buf) continue;
        const meta = computeWaveformFromAudioBuffer(buf);
        project = applyDecodedAudioMeta(project, asset.id, {
          durationMs: meta.durationMs,
          waveformPeaks: meta.peaks,
          waveformRms: meta.rms,
          channelCount: buf.numberOfChannels,
        });
        changed = true;
      }
      if (cancelled || !changed) return;
      setDraftProject(project);
      setTrackVisibility((prev) =>
        ensureAudioTrackVisibility(prev, project.audioTracks),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [
    projectId,
    audioAssetDecodeKey,
    draftProject,
    setDraftProject,
    setFailedAudioAssetIds,
    setTrackVisibility,
  ]);
}
