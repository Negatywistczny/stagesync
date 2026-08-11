import {
  useState,
  useRef,
  useCallback,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Project, ProjectAsset, AudioClip } from "@stagesync/shared";
import { channelModeFromChannelCount } from "@stagesync/shared";
import { uploadProjectAudio } from "@lib/shell-operator/projectAssetsApi.js";
import { loadAudioBuffer } from "@lib/audio/audioPlayback.js";
import {
  setAudioTrackChannelMode,
  placeImportedAudioClipAt,
} from "@lib/audio/audioLaneEdit.js";
import {
  ensureAudioTrackVisibility,
  type TrackVisibilityMap,
} from "@lib/timeline/timelineTracks.js";
import {
  syncPresentAfterSave,
  createDraftHistory,
  type DraftHistory,
} from "@lib/client/draftHistory.js";

export type UseTimelineAudioUploadOptions = {
  projectId?: string;
  draftProject: Project | null;
  setSavedProject: Dispatch<SetStateAction<Project | null>>;
  setDraftProject: Dispatch<SetStateAction<Project | null>>;
  setDraftHistory: Dispatch<SetStateAction<DraftHistory | null>>;
  setTrackVisibility: Dispatch<SetStateAction<TrackVisibilityMap>>;
  setLoadError: (err: string | null) => void;
};

export function useTimelineAudioUpload({
  projectId,
  draftProject,
  setSavedProject,
  setDraftProject,
  setDraftHistory,
  setTrackVisibility,
  setLoadError,
}: UseTimelineAudioUploadOptions) {
  const [audioUploadPending, setAudioUploadPending] = useState(false);
  const audioUploadPendingRef = useRef(false);

  const onUploadAudioToTrack = useCallback(
    async (trackId: string, file: File, opts?: { startTicks?: number }) => {
      if (!projectId || !draftProject) return;
      if (audioUploadPendingRef.current) return;
      audioUploadPendingRef.current = true;
      setAudioUploadPending(true);
      try {
        const next = await uploadProjectAudio(projectId, file, {
          trackId,
          startTicks: opts?.startTicks,
        });
        // Merge any client-side audio tracks that might not be on server yet
        const mergedTracks = [...next.audioTracks];
        for (const dt of draftProject.audioTracks) {
          if (!mergedTracks.some((t) => t.id === dt.id)) {
            mergedTracks.push(dt);
          }
        }
        let project: Project = { ...next, audioTracks: mergedTracks };
        let targetTrackId = trackId;
        let lastClipId: string | null = null;
        if (next.assets.length && next.audioClips.length) {
          const uploadedAsset = next.assets
            .filter((a: ProjectAsset) => a.kind === "audio")
            .at(-1);
          const uploadedClip = uploadedAsset
            ? (next.audioClips.find(
                (c: AudioClip) => c.assetId === uploadedAsset.id,
              ) ?? next.audioClips[next.audioClips.length - 1]!)
            : next.audioClips[next.audioClips.length - 1]!;
          lastClipId = uploadedClip.id;
          if (trackId && uploadedClip.trackId !== trackId) {
            project = {
              ...project,
              audioClips: project.audioClips.map((c: AudioClip) =>
                c.id === uploadedClip.id ? { ...c, trackId } : c,
              ),
            };
          }
          targetTrackId = trackId || uploadedClip.trackId;
          const buf = await loadAudioBuffer(projectId, uploadedClip.assetId);
          if (buf) {
            project = setAudioTrackChannelMode(
              project,
              targetTrackId,
              channelModeFromChannelCount(buf.numberOfChannels),
            );
          }
          if (
            lastClipId &&
            opts?.startTicks != null &&
            Number.isFinite(opts.startTicks)
          ) {
            project = placeImportedAudioClipAt(
              project,
              lastClipId,
              opts.startTicks,
              buf ? { durationMs: buf.duration * 1000 } : undefined,
            );
          } else if (lastClipId && buf) {
            project = placeImportedAudioClipAt(
              project,
              lastClipId,
              uploadedClip.startTicks,
              { durationMs: buf.duration * 1000 },
            );
          }
        }
        setSavedProject(project);
        setDraftProject(project);
        setDraftHistory((h: DraftHistory | null) =>
          h ? syncPresentAfterSave(h, project) : createDraftHistory(project),
        );
        setTrackVisibility((prev: TrackVisibilityMap) =>
          ensureAudioTrackVisibility(prev, project.audioTracks),
        );
      } catch (err) {
        setLoadError(
          err instanceof Error
            ? err.message
            : "Przesyłanie pliku audio nie powiodło się",
        );
      } finally {
        audioUploadPendingRef.current = false;
        setAudioUploadPending(false);
      }
    },
    [
      projectId,
      draftProject,
      setSavedProject,
      setDraftProject,
      setDraftHistory,
      setTrackVisibility,
      setLoadError,
    ],
  );

  return {
    audioUploadPending,
    audioUploadPendingRef,
    onUploadAudioToTrack,
  };
}
