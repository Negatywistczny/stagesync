import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Project } from "@stagesync/shared";
import {
  addAudioTrack,
  removeAudioTrack,
  duplicateAudioTrack,
  addAudioBus,
  MAX_AUDIO_TRACKS,
} from "@lib/audio/audioLaneEdit.js";
import {
  addAudioHardwareOutput,
  canAddHardwareOutput,
  removeAudioHardwareOutput,
  updateAudioHardwareOutput,
} from "@lib/audio/audioHwEdit.js";
import { getAudioHwCapability } from "@lib/audio/audioHwCapability.js";
import {
  clearSelection,
  clearTrackSelection,
  pruneTrackSelection,
  selectAudioTrack,
  type ClipSelection,
  type TrackSelection,
} from "@lib/timeline/timelineSelection.js";
import {
  ensureAudioTrackVisibility,
  type TrackVisibilityMap,
} from "@lib/timeline/timelineTracks.js";

export type UseTimelineTrackActionsOptions = {
  draftProject: Project | null;
  commitDraft: (next: Project) => void;
  setClipSelection: Dispatch<SetStateAction<ClipSelection>>;
  setTrackSelection: Dispatch<SetStateAction<TrackSelection>>;
  setInspectorVisible: (v: boolean) => void;
  setEyeOpen: (v: boolean) => void;
  setTrackVisibility: Dispatch<SetStateAction<TrackVisibilityMap>>;
  setSoloAudioTrackIds: Dispatch<SetStateAction<string[]>>;
  setTrackRename: Dispatch<
    SetStateAction<{ trackId: string; name: string } | null>
  >;
  setSelectedBusId: Dispatch<SetStateAction<string | null>>;
  setSelectedHwOutputId: Dispatch<SetStateAction<string | null>>;
  isMobilePreview: boolean;
  setTouchAlertOpen: (v: boolean) => void;
  setLoadError: (err: string | null) => void;
  openContextMenu: (args: any) => void;
};

export function useTimelineTrackActions({
  draftProject,
  commitDraft,
  setClipSelection,
  setTrackSelection,
  setInspectorVisible,
  setEyeOpen,
  setTrackVisibility,
  setSoloAudioTrackIds,
  setTrackRename,
  setSelectedBusId,
  setSelectedHwOutputId,
  isMobilePreview,
  setTouchAlertOpen,
  setLoadError,
  openContextMenu,
}: UseTimelineTrackActionsOptions) {
  const onAddAudioTrack = useCallback(() => {
    if (isMobilePreview) {
      setTouchAlertOpen(true);
      return;
    }
    if (!draftProject) return;
    if (draftProject.audioTracks.length >= MAX_AUDIO_TRACKS) {
      setLoadError(`Limit ścieżek audio (${MAX_AUDIO_TRACKS}) osiągnięty`);
      return;
    }
    const { project, trackId } = addAudioTrack(draftProject);
    commitDraft(project);
    setClipSelection(clearSelection());
    setTrackSelection(selectAudioTrack(trackId));
    setInspectorVisible(true);
    setEyeOpen(false);
    setTrackVisibility((prev) =>
      ensureAudioTrackVisibility(prev, project.audioTracks),
    );
  }, [
    isMobilePreview,
    draftProject,
    commitDraft,
    setClipSelection,
    setTrackSelection,
    setInspectorVisible,
    setEyeOpen,
    setTrackVisibility,
    setTouchAlertOpen,
    setLoadError,
  ]);

  const onRemoveAudioTrack = useCallback(
    (trackId: string) => {
      if (!draftProject) return;
      const next = removeAudioTrack(draftProject, trackId);
      if (next === draftProject) return;
      commitDraft(next);
      setClipSelection(clearSelection());
      setTrackSelection((ts) =>
        pruneTrackSelection(ts, new Set(next.audioTracks.map((t) => t.id))),
      );
      setSoloAudioTrackIds((prev) => prev.filter((id) => id !== trackId));
      setTrackVisibility((prev) =>
        ensureAudioTrackVisibility(prev, next.audioTracks),
      );
      setTrackRename((prev) => (prev?.trackId === trackId ? null : prev));
    },
    [
      draftProject,
      commitDraft,
      setClipSelection,
      setTrackSelection,
      setSoloAudioTrackIds,
      setTrackVisibility,
      setTrackRename,
    ],
  );

  const onDuplicateAudioTrack = useCallback(
    (trackId: string) => {
      if (!draftProject) return;
      if (draftProject.audioTracks.length >= MAX_AUDIO_TRACKS) {
        setLoadError(`Limit ścieżek audio (${MAX_AUDIO_TRACKS}) osiągnięty`);
        return;
      }
      try {
        const result = duplicateAudioTrack(draftProject, trackId);
        if (!result) return;
        commitDraft(result.project);
        setClipSelection(clearSelection());
        setTrackSelection(selectAudioTrack(result.trackId));
        setTrackVisibility((prev) =>
          ensureAudioTrackVisibility(prev, result.project.audioTracks),
        );
      } catch (err) {
        setLoadError(
          err instanceof Error
            ? err.message
            : "Nie udało się zduplikować ścieżki",
        );
      }
    },
    [
      draftProject,
      commitDraft,
      setClipSelection,
      setTrackSelection,
      setTrackVisibility,
      setLoadError,
    ],
  );

  const onAddBus = useCallback(() => {
    if (!draftProject) return;
    try {
      const { project } = addAudioBus(draftProject);
      commitDraft(project);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Nie udało się dodać busa",
      );
    }
  }, [draftProject, commitDraft, setLoadError]);

  const onAddHwOut = useCallback(() => {
    if (!draftProject) return;
    const maxChannelCount = getAudioHwCapability().maxChannelCount;
    const rows = draftProject.audioHardwareOutputs ?? [];
    if (
      !canAddHardwareOutput(
        rows,
        maxChannelCount,
        "stereo",
        draftProject.masterOutput,
      )
    ) {
      return;
    }
    try {
      const { project } = addAudioHardwareOutput(draftProject, undefined, {
        maxChannelCount,
      });
      commitDraft(project);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Nie udało się dodać HW Out",
      );
    }
  }, [draftProject, commitDraft, setLoadError]);

  const onHwGainChange = useCallback(
    (hwOutputId: string, gainDb: number) => {
      if (!draftProject) return;
      commitDraft(
        updateAudioHardwareOutput(draftProject, hwOutputId, { gainDb }),
      );
    },
    [draftProject, commitDraft],
  );

  const onHwMuteToggle = useCallback(
    (hwOutputId: string) => {
      if (!draftProject) return;
      const row = draftProject.audioHardwareOutputs?.find(
        (h) => h.id === hwOutputId,
      );
      commitDraft(
        updateAudioHardwareOutput(draftProject, hwOutputId, {
          muted: !row?.muted,
        }),
      );
    },
    [draftProject, commitDraft],
  );

  const onHwChannelModeChange = useCallback(
    (hwOutputId: string, mode: "mono" | "stereo") => {
      if (!draftProject) return;
      commitDraft(
        updateAudioHardwareOutput(draftProject, hwOutputId, {
          channelMode: mode,
        }),
      );
    },
    [draftProject, commitDraft],
  );

  const onHwSelect = useCallback(
    (hwOutputId: string, e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("button, label, input")) {
        return;
      }
      setClipSelection(clearSelection());
      setTrackSelection(clearTrackSelection());
      setSelectedBusId(null);
      setSelectedHwOutputId(hwOutputId);
    },
    [
      setClipSelection,
      setTrackSelection,
      setSelectedBusId,
      setSelectedHwOutputId,
    ],
  );

  const openHwContextMenu = useCallback(
    (hwOutputId: string, clientX: number, clientY: number) => {
      setClipSelection(clearSelection());
      setTrackSelection(clearTrackSelection());
      setSelectedBusId(null);
      setSelectedHwOutputId(hwOutputId);
      openContextMenu({
        x: clientX,
        y: clientY,
        label: "Menu HW Out",
        items: [
          {
            id: "remove",
            label: "Usuń wyjście HW",
            danger: true,
            onSelect: () => {
              if (!draftProject) return;
              commitDraft(removeAudioHardwareOutput(draftProject, hwOutputId));
              setSelectedHwOutputId((prev) =>
                prev === hwOutputId ? null : prev,
              );
            },
          },
        ],
      });
    },
    [
      setClipSelection,
      setTrackSelection,
      setSelectedBusId,
      setSelectedHwOutputId,
      openContextMenu,
      draftProject,
      commitDraft,
    ],
  );

  const onHwContextMenu = useCallback(
    (hwOutputId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      openHwContextMenu(hwOutputId, e.clientX, e.clientY);
    },
    [openHwContextMenu],
  );

  return {
    onAddAudioTrack,
    onRemoveAudioTrack,
    onDuplicateAudioTrack,
    onAddBus,
    onAddHwOut,
    onHwGainChange,
    onHwMuteToggle,
    onHwChannelModeChange,
    onHwSelect,
    openHwContextMenu,
    onHwContextMenu,
  };
}
