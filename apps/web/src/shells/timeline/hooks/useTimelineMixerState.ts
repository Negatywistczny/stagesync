import {
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Project } from "@stagesync/shared";
import {
  setAudioTrackName,
  setAudioTracksMuted,
  setAudioBusName,
  removeAudioBus,
  MAX_AUDIO_TRACKS,
} from "@lib/audio/audioLaneEdit.js";
import {
  applySoloButtonClick,
  clearSelection,
  clearTrackSelection,
  isAudioTrackSelected,
  isMultiSelectClick,
  resolveMuteButtonClick,
  selectAudioTrack,
  selectAudioTrackRange,
  toggleAudioTrackSelected,
  type ClipSelection,
  type TrackSelection,
} from "@lib/timeline/timelineSelection.js";
import type { TrackVisibilityMap } from "@lib/timeline/timelineTracks.js";
import {
  audioTrackContextMenuLabel,
  buildAudioTrackContextMenuItems,
} from "@lib/timeline/timelineContextMenus.js";
import { useTimelineTrackActions } from "./useTimelineTrackActions.js";
import { useTimelineMixerCallbacks } from "./useTimelineMixerCallbacks.js";

export type UseTimelineMixerStateOptions = {
  draftProject: Project | null;
  commitDraft: (next: Project) => void;
  setClipSelection: Dispatch<SetStateAction<ClipSelection>>;
  trackSelection: TrackSelection;
  setTrackSelection: Dispatch<SetStateAction<TrackSelection>>;
  setInspectorVisible: (v: boolean) => void;
  setEyeOpen: (v: boolean) => void;
  setTrackVisibility: Dispatch<SetStateAction<TrackVisibilityMap>>;
  soloAudioTrackIds: string[];
  setSoloAudioTrackIds: Dispatch<SetStateAction<string[]>>;
  isMobilePreview: boolean;
  setTouchAlertOpen: (v: boolean) => void;
  setLoadError: (err: string | null) => void;
  openContextMenu: (args: any) => void;
  playing: boolean;
};

export function useTimelineMixerState({
  draftProject,
  commitDraft,
  setClipSelection,
  trackSelection,
  setTrackSelection,
  setInspectorVisible,
  setEyeOpen,
  setTrackVisibility,
  setSoloAudioTrackIds,
  isMobilePreview,
  setTouchAlertOpen,
  setLoadError,
  openContextMenu,
  playing,
}: UseTimelineMixerStateOptions) {
  const [soloBusIds, setSoloBusIds] = useState<string[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [selectedHwOutputId, setSelectedHwOutputId] = useState<string | null>(
    null,
  );
  const [busRename, setBusRename] = useState<{
    busId: string;
    name: string;
  } | null>(null);
  const [trackRename, setTrackRename] = useState<{
    trackId: string;
    name: string;
  } | null>(null);

  const trackActions = useTimelineTrackActions({
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
  });

  const openTrackRename = useCallback(
    (trackId: string) => {
      const name =
        draftProject?.audioTracks.find((t) => t.id === trackId)?.name ?? "";
      setTrackRename({ trackId, name });
    },
    [draftProject?.audioTracks],
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
  }, [draftProject, trackRename, commitDraft]);

  const cancelTrackRename = useCallback(() => {
    setTrackRename(null);
  }, []);

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
          onDuplicate: () => trackActions.onDuplicateAudioTrack(trackId),
          onRemove: () => trackActions.onRemoveAudioTrack(trackId),
        }),
      });
    },
    [
      isMobilePreview,
      setTouchAlertOpen,
      setClipSelection,
      trackSelection,
      setTrackSelection,
      openContextMenu,
      draftProject?.audioTracks.length,
      openTrackRename,
      trackActions,
    ],
  );

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
        setTrackSelection((ts) =>
          selectAudioTrackRange(ts, trackId, orderedIds),
        );
      } else if (isMultiSelectClick(e)) {
        setTrackSelection((ts) => toggleAudioTrackSelected(ts, trackId));
      } else {
        setTrackSelection(selectAudioTrack(trackId));
      }
      setInspectorVisible(true);
    },
    [
      setClipSelection,
      draftProject?.audioTracks,
      setTrackSelection,
      setInspectorVisible,
    ],
  );

  const onAudioTrackSoloClick = useCallback(
    (e: React.MouseEvent, trackId: string) => {
      const allIds = (draftProject?.audioTracks ?? []).map((t) => t.id);
      setSoloAudioTrackIds((prev) =>
        applySoloButtonClick(prev, trackId, allIds, trackSelection.ids, e),
      );
      setSoloBusIds([]);
    },
    [draftProject?.audioTracks, setSoloAudioTrackIds, trackSelection.ids],
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

  const openBusRename = useCallback(
    (busId: string) => {
      const name =
        draftProject?.audioBusses?.find((b) => b.id === busId)?.name ?? "";
      setBusRename({ busId, name });
    },
    [draftProject?.audioBusses],
  );

  const commitBusRename = useCallback(() => {
    if (!draftProject || !busRename) return;
    const next = setAudioBusName(draftProject, busRename.busId, busRename.name);
    if (next !== draftProject) commitDraft(next);
    setBusRename(null);
  }, [draftProject, busRename, commitDraft]);

  const openBusContextMenu = useCallback(
    (busId: string, clientX: number, clientY: number) => {
      setClipSelection(clearSelection());
      setTrackSelection(clearTrackSelection());
      setSelectedHwOutputId(null);
      setSelectedBusId(busId);
      openContextMenu({
        x: clientX,
        y: clientY,
        label: "Menu busa",
        items: [
          {
            id: "rename",
            label: "Zmień nazwę",
            onSelect: () => openBusRename(busId),
          },
          {
            id: "remove",
            label: "Usuń bus",
            danger: true,
            onSelect: () => {
              if (!draftProject) return;
              commitDraft(removeAudioBus(draftProject, busId));
              setSoloBusIds((prev) => prev.filter((id) => id !== busId));
              setSelectedBusId((prev) => (prev === busId ? null : prev));
            },
          },
        ],
      });
    },
    [
      setClipSelection,
      setTrackSelection,
      openContextMenu,
      openBusRename,
      draftProject,
      commitDraft,
    ],
  );

  const mixerCallbacks = useTimelineMixerCallbacks({
    draftProject,
    commitDraft,
    playing,
    setClipSelection,
    setTrackSelection,
    setSelectedBusId,
    setSelectedHwOutputId,
    setSoloBusIds,
    setSoloAudioTrackIds,
    setLoadError,
    onAudioTrackHeaderClick,
    openAudioTrackContextMenu,
    onAudioTrackSoloClick,
    onAudioTrackMuteClick,
    openTrackRename,
    setTrackRename,
    commitTrackRename,
    cancelTrackRename,
    openBusContextMenu,
    openBusRename,
    setBusRename,
    commitBusRename,
  });

  return {
    soloBusIds,
    setSoloBusIds,
    selectedBusId,
    setSelectedBusId,
    selectedHwOutputId,
    setSelectedHwOutputId,
    busRename,
    setBusRename,
    trackRename,
    setTrackRename,
    openTrackRename,
    commitTrackRename,
    cancelTrackRename,
    openAudioTrackContextMenu,
    onAudioTrackHeaderClick,
    onAudioTrackSoloClick,
    onAudioTrackMuteClick,
    openBusRename,
    commitBusRename,
    openBusContextMenu,
    ...trackActions,
    ...mixerCallbacks,
  };
}
