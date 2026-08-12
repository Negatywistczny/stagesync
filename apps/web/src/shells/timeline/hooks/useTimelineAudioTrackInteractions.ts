import { useCallback } from "react";
import type { Project } from "@stagesync/shared";
import type { OpenContextMenuArgs } from "@stagesync/ui";
import {
  applySoloButtonClick,
  clearSelection,
  isAudioTrackSelected,
  isMultiSelectClick,
  resolveMuteButtonClick,
  selectAudioTrack,
  selectAudioTrackRange,
  toggleAudioTrackSelected,
  type ClipSelection,
  type TrackSelection,
} from "@lib/timeline/timelineSelection.js";
import {
  buildTrackList,
  type TrackVisibilityMap,
} from "@lib/timeline/timelineTracks.js";
import {
  buildAudioTrackContextMenuItems,
  audioTrackContextMenuLabel,
} from "@lib/timeline/timelineContextMenus.js";
import {
  setAudioTracksMuted,
  setAudioTrackName,
  MAX_AUDIO_TRACKS,
} from "@lib/audio/audioLaneEdit.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Params {
  draftProject: Project | null;
  commitDraft: (next: Project) => void;
  trackSelection: TrackSelection;
  setTrackSelection: React.Dispatch<React.SetStateAction<TrackSelection>>;
  setClipSelection: React.Dispatch<React.SetStateAction<ClipSelection>>;
  setSelectedBusId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedHwOutputId: React.Dispatch<React.SetStateAction<string | null>>;
  setInspectorVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setSoloAudioTrackIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSoloBusIds: React.Dispatch<React.SetStateAction<string[]>>;
  setTrackVisibility: React.Dispatch<React.SetStateAction<TrackVisibilityMap>>;
  trackRename: { trackId: string; name: string } | null;
  setTrackRename: React.Dispatch<
    React.SetStateAction<{ trackId: string; name: string } | null>
  >;
  isMobilePreview: boolean;
  setTouchAlertOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openContextMenu: (args: OpenContextMenuArgs) => void;
  onDuplicateAudioTrack: (trackId: string) => void;
  onRemoveAudioTrack: (trackId: string) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTimelineAudioTrackInteractions({
  draftProject,
  commitDraft,
  trackSelection,
  setTrackSelection,
  setClipSelection,
  setSelectedBusId,
  setSelectedHwOutputId,
  setInspectorVisible,
  setSoloAudioTrackIds,
  setSoloBusIds,
  setTrackVisibility,
  trackRename,
  setTrackRename,
  isMobilePreview,
  setTouchAlertOpen,
  openContextMenu,
  onDuplicateAudioTrack,
  onRemoveAudioTrack,
}: Params) {
  // --- Toggle track visibility -------------------------------------------

  const toggleTrack = useCallback(
    (id: string) => {
      const def = buildTrackList(draftProject?.audioTracks ?? []).find(
        (t) => t.id === id,
      );
      if (def?.locked) return;
      setTrackVisibility((prev) => ({ ...prev, [id]: !prev[id] }));
    },
    [draftProject?.audioTracks, setTrackVisibility],
  );

  // --- Track rename helpers -----------------------------------------------

  const openTrackRename = useCallback(
    (trackId: string) => {
      const name =
        draftProject?.audioTracks.find((t) => t.id === trackId)?.name ?? "";
      setTrackRename({ trackId, name });
    },
    [draftProject?.audioTracks, setTrackRename],
  );

  const commitTrackRename = useCallback(() => {
    if (!draftProject || !trackRename) return;
    const next = setAudioTrackName(
      draftProject,
      trackRename.trackId,
      trackRename.name,
    );
    if (next !== draftProject) commitDraft(next);
    setTrackRename(null);
  }, [draftProject, trackRename, commitDraft, setTrackRename]);

  const cancelTrackRename = useCallback(() => {
    setTrackRename(null);
  }, [setTrackRename]);

  // --- Audio track context menu -------------------------------------------

  const openAudioTrackContextMenu = useCallback(
    (trackId: string, clientX: number, clientY: number) => {
      if (isMobilePreview) {
        setTouchAlertOpen(true);
        return;
      }
      setClipSelection(clearSelection());
      setSelectedBusId(null);
      setSelectedHwOutputId(null);
      const alreadySelected = isAudioTrackSelected(trackSelection, trackId);
      const trackCount = alreadySelected ? trackSelection.ids.length : 1;
      if (!alreadySelected) {
        setTrackSelection(selectAudioTrack(trackId));
      }
      openContextMenu({
        x: clientX,
        y: clientY,
        label: audioTrackContextMenuLabel(trackCount),
        items: buildAudioTrackContextMenuItems({
          canDuplicate:
            (draftProject?.audioTracks.length ?? 0) < MAX_AUDIO_TRACKS,
          onRename: () => openTrackRename(trackId),
          onDuplicate: () => onDuplicateAudioTrack(trackId),
          onRemove: () => onRemoveAudioTrack(trackId),
        }),
      });
    },
    [
      isMobilePreview,
      setTouchAlertOpen,
      setClipSelection,
      setSelectedBusId,
      setSelectedHwOutputId,
      trackSelection,
      setTrackSelection,
      openContextMenu,
      draftProject?.audioTracks,
      openTrackRename,
      onDuplicateAudioTrack,
      onRemoveAudioTrack,
    ],
  );

  // --- Audio track header click -------------------------------------------

  const onAudioTrackHeaderClick = useCallback(
    (e: React.MouseEvent, trackId: string) => {
      if ((e.target as HTMLElement).closest("button, label, input")) {
        return;
      }
      setClipSelection(clearSelection());
      setSelectedBusId(null);
      setSelectedHwOutputId(null);
      const orderedIds = (draftProject?.audioTracks ?? []).map((t) => t.id);
      if (e.shiftKey) {
        setTrackSelection(
          selectAudioTrackRange(trackSelection, trackId, orderedIds),
        );
      } else if (isMultiSelectClick(e)) {
        setTrackSelection(toggleAudioTrackSelected(trackSelection, trackId));
      } else {
        setTrackSelection(selectAudioTrack(trackId));
      }
      setInspectorVisible(true);
    },
    [
      setClipSelection,
      setSelectedBusId,
      setSelectedHwOutputId,
      draftProject?.audioTracks,
      trackSelection,
      setTrackSelection,
      setInspectorVisible,
    ],
  );

  // --- Solo / Mute clicks ------------------------------------------------

  const onAudioTrackSoloClick = useCallback(
    (e: React.MouseEvent, trackId: string) => {
      const allIds = (draftProject?.audioTracks ?? []).map((t) => t.id);
      setSoloAudioTrackIds((prev) =>
        applySoloButtonClick(prev, trackId, allIds, trackSelection.ids, e),
      );
      setSoloBusIds([]);
    },
    [
      draftProject?.audioTracks,
      trackSelection.ids,
      setSoloAudioTrackIds,
      setSoloBusIds,
    ],
  );

  const onAudioTrackMuteClick = useCallback(
    (e: React.MouseEvent, trackId: string) => {
      if (!draftProject) return;
      const track = draftProject.audioTracks.find((t) => t.id === trackId);
      if (!track) return;
      const allIds = draftProject.audioTracks.map((t) => t.id);
      const { trackIds, muted } = resolveMuteButtonClick(
        trackId,
        Boolean(track.muted),
        allIds,
        trackSelection.ids,
        e,
      );
      commitDraft(setAudioTracksMuted(draftProject, trackIds, muted));
    },
    [draftProject, trackSelection.ids, commitDraft],
  );

  return {
    toggleTrack,
    openTrackRename,
    commitTrackRename,
    cancelTrackRename,
    openAudioTrackContextMenu,
    onAudioTrackHeaderClick,
    onAudioTrackSoloClick,
    onAudioTrackMuteClick,
  };
}
