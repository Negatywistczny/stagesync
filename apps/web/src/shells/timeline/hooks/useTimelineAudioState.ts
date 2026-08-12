import React, { useState } from "react";
import type { Project } from "@stagesync/shared";
import type {
  ClipSelection,
  TrackSelection,
} from "@lib/timeline/timelineSelection.js";
import type { TrackVisibilityMap } from "@lib/timeline/timelineTracks.js";
import { useTimelineAudioUpload } from "./useTimelineAudioUpload.js";
import { useTimelineTrackActions } from "./useTimelineTrackActions.js";
import { useTimelineAudioTrackInteractions } from "./useTimelineAudioTrackInteractions.js";
import { useTimelineDockCallbacks } from "./useTimelineDockCallbacks.js";

interface Params {
  projectId?: string;
  draftProject: Project | null;
  commitDraft: (p: Project) => void;
  setSavedProject: React.Dispatch<React.SetStateAction<Project | null>>;
  setDraftProject: React.Dispatch<React.SetStateAction<Project | null>>;
  setDraftHistory: React.Dispatch<React.SetStateAction<any>>;
  setTrackVisibility: React.Dispatch<React.SetStateAction<TrackVisibilityMap>>;
  setLoadError: React.Dispatch<React.SetStateAction<string | null>>;
  trackSelection: TrackSelection;
  setTrackSelection: React.Dispatch<React.SetStateAction<TrackSelection>>;
  setClipSelection: React.Dispatch<React.SetStateAction<ClipSelection>>;
  setSelectedBusId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedHwOutputId: React.Dispatch<React.SetStateAction<string | null>>;
  setInspectorVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setEyeOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSoloAudioTrackIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSoloBusIds: React.Dispatch<React.SetStateAction<string[]>>;
  isMobilePreview: boolean;
  setTouchAlertOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openContextMenu: (args: any) => void;
  state: any;
}

export function useTimelineAudioState({
  projectId,
  draftProject,
  commitDraft,
  setSavedProject,
  setDraftProject,
  setDraftHistory,
  setTrackVisibility,
  setLoadError,
  trackSelection,
  setTrackSelection,
  setClipSelection,
  setSelectedBusId,
  setSelectedHwOutputId,
  setInspectorVisible,
  setEyeOpen,
  setSoloAudioTrackIds,
  setSoloBusIds,
  isMobilePreview,
  setTouchAlertOpen,
  openContextMenu,
  state,
}: Params) {
  const [trackRename, setTrackRename] = useState<{
    trackId: string;
    name: string;
  } | null>(null);
  const [audioLaneDropId, setAudioLaneDropId] = useState<string | null>(null);

  const { audioUploadPending, onUploadAudioToTrack } = useTimelineAudioUpload({
    projectId,
    draftProject,
    setSavedProject,
    setDraftProject,
    setDraftHistory,
    setTrackVisibility,
    setLoadError,
  });

  const { onAddAudioTrack, onRemoveAudioTrack, onDuplicateAudioTrack } =
    useTimelineTrackActions({
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

  const trackInteractions = useTimelineAudioTrackInteractions({
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
  });

  const dockCallbacks = useTimelineDockCallbacks({
    draftProject,
    commitDraft,
    state,
    setLoadError,
    onAudioTrackHeaderClick: trackInteractions.onAudioTrackHeaderClick,
    openAudioTrackContextMenu: trackInteractions.openAudioTrackContextMenu,
    onAudioTrackSoloClick: trackInteractions.onAudioTrackSoloClick,
    onAudioTrackMuteClick: trackInteractions.onAudioTrackMuteClick,
    openTrackRename: trackInteractions.openTrackRename,
    setTrackRename,
    commitTrackRename: trackInteractions.commitTrackRename,
    cancelTrackRename: trackInteractions.cancelTrackRename,
    setClipSelection,
    setTrackSelection,
    setSelectedBusId,
    setSelectedHwOutputId,
    setSoloBusIds,
    setSoloAudioTrackIds,
    openContextMenu,
  });

  return {
    trackRename,
    setTrackRename,
    audioLaneDropId,
    setAudioLaneDropId,
    audioUploadPending,
    onUploadAudioToTrack,
    onAddAudioTrack,
    onRemoveAudioTrack,
    onDuplicateAudioTrack,
    ...trackInteractions,
    ...dockCallbacks,
  };
}
