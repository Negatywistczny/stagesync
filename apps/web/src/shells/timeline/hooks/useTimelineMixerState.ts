import {
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Project } from "@stagesync/shared";
import {
  addAudioTrack,
  removeAudioTrack,
  duplicateAudioTrack,
  setAudioTrackName,
  setAudioTracksMuted,
  setAudioTrackGainDb,
  setAudioTrackPan,
  setAudioTrackChannelMode,
  setAudioTrackColor,
  setAudioTrackIcon,
  setAudioTrackOutput,
  setMasterGainDb,
  addAudioBus,
  removeAudioBus,
  setAudioBusName,
  setAudioBusMuted,
  setAudioBusGainDb,
  setAudioBusPan,
  setAudioBusChannelMode,
  setAudioBusOutput,
  MAX_AUDIO_TRACKS,
} from "@lib/audio/audioLaneEdit.js";
import {
  addAudioHardwareOutput,
  canAddHardwareOutput,
  removeAudioHardwareOutput,
  setMasterOutputRouting,
  updateAudioHardwareOutput,
} from "@lib/audio/audioHwEdit.js";
import { getAudioHwCapability } from "@lib/audio/audioHwCapability.js";
import { isHwOutRepatchBlockedWhilePlaying } from "@stagesync/shared";
import {
  applySoloButtonClick,
  clearSelection,
  clearTrackSelection,
  isAudioTrackSelected,
  isMultiSelectClick,
  resolveMuteButtonClick,
  pruneTrackSelection,
  selectAudioTrack,
  selectAudioTrackRange,
  toggleAudioTrackSelected,
  type ClipSelection,
  type TrackSelection,
} from "@lib/timeline/timelineSelection.js";
import {
  ensureAudioTrackVisibility,
  type TrackVisibilityMap,
} from "@lib/timeline/timelineTracks.js";
import {
  audioTrackContextMenuLabel,
  buildAudioTrackContextMenuItems,
} from "@lib/timeline/timelineContextMenus.js";
import type {
  ChannelStripCallbacks,
  MasterStripCallbacks,
} from "../channelStrip/channelStripTypes.js";

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
  soloAudioTrackIds,
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
          onDuplicate: () => onDuplicateAudioTrack(trackId),
          onRemove: () => onRemoveAudioTrack(trackId),
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
      onDuplicateAudioTrack,
      onRemoveAudioTrack,
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

  const buildChannelStripCallbacks = useCallback(
    (trackId: string): ChannelStripCallbacks => {
      return {
        onSelect: (e) => onAudioTrackHeaderClick(e, trackId),
        onContextMenu: (e) => {
          e.preventDefault();
          e.stopPropagation();
          openAudioTrackContextMenu(trackId, e.clientX, e.clientY);
        },
        onSoloClick: (e) => onAudioTrackSoloClick(e, trackId),
        onMuteClick: (e) => onAudioTrackMuteClick(e, trackId),
        onGainChange: (v) => {
          if (!draftProject) return;
          commitDraft(setAudioTrackGainDb(draftProject, trackId, v));
        },
        onGainReset: () => {
          if (!draftProject) return;
          commitDraft(setAudioTrackGainDb(draftProject, trackId, 0));
        },
        onPanChange: (v) => {
          if (!draftProject) return;
          commitDraft(setAudioTrackPan(draftProject, trackId, v));
        },
        onPanReset: () => {
          if (!draftProject) return;
          commitDraft(setAudioTrackPan(draftProject, trackId, 0));
        },
        onChannelModeChange: (mode) => {
          if (!draftProject) return;
          commitDraft(setAudioTrackChannelMode(draftProject, trackId, mode));
        },
        onColorChange: (color) => {
          if (!draftProject) return;
          commitDraft(setAudioTrackColor(draftProject, trackId, color));
        },
        onIconChange: (icon) => {
          if (!draftProject) return;
          commitDraft(setAudioTrackIcon(draftProject, trackId, icon));
        },
        onOutputChange: (output) => {
          if (!draftProject) return;
          const prev = draftProject.audioTracks.find(
            (t) => t.id === trackId,
          )?.output;
          if (isHwOutRepatchBlockedWhilePlaying(playing, prev, output)) {
            return;
          }
          commitDraft(setAudioTrackOutput(draftProject, trackId, output));
        },
        onNameDoubleClick: () => openTrackRename(trackId),
        onRenameChange: (name) => {
          setTrackRename((prev) =>
            prev && prev.trackId === trackId ? { ...prev, name } : prev,
          );
        },
        onRenameCommit: commitTrackRename,
        onRenameCancel: cancelTrackRename,
      };
    },
    [
      onAudioTrackHeaderClick,
      openAudioTrackContextMenu,
      onAudioTrackSoloClick,
      onAudioTrackMuteClick,
      draftProject,
      commitDraft,
      playing,
      openTrackRename,
      commitTrackRename,
      cancelTrackRename,
    ],
  );

  const buildMasterStripCallbacks = useCallback((): MasterStripCallbacks => {
    return {
      onGainChange: (v) => {
        if (!draftProject) return;
        commitDraft(setMasterGainDb(draftProject, v));
      },
      onGainReset: () => {
        if (!draftProject) return;
        commitDraft(setMasterGainDb(draftProject, 0));
      },
      onOutputChange: (value) => {
        if (!draftProject || playing) return;
        const m = /^ch:(\d+)$/.exec(value);
        if (!m) return;
        const channelOffset = Number(m[1]);
        try {
          commitDraft(setMasterOutputRouting(draftProject, { channelOffset }));
        } catch (err) {
          setLoadError(
            err instanceof Error
              ? err.message
              : "Nie udało się zmienić wyjścia Master",
          );
        }
      },
    };
  }, [draftProject, commitDraft, playing, setLoadError]);

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
      openContextMenu,
      draftProject,
      commitDraft,
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
    [setClipSelection, setTrackSelection],
  );

  const onHwContextMenu = useCallback(
    (hwOutputId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      openHwContextMenu(hwOutputId, e.clientX, e.clientY);
    },
    [openHwContextMenu],
  );

  const buildBusCallbacks = useCallback(
    (busId: string): ChannelStripCallbacks => {
      return {
        onSelect: () => {
          setClipSelection(clearSelection());
          setTrackSelection(clearTrackSelection());
          setSelectedHwOutputId(null);
          setSelectedBusId(busId);
        },
        onContextMenu: (e) => {
          e.preventDefault();
          e.stopPropagation();
          openBusContextMenu(busId, e.clientX, e.clientY);
        },
        onSoloClick: (e) => {
          e.stopPropagation();
          const allIds = (draftProject?.audioBusses ?? []).map((b) => b.id);
          setSoloBusIds((prev) => {
            const on = prev.includes(busId);
            if (e.altKey) return on && prev.length === 1 ? [] : [busId];
            if (on) return prev.filter((id) => id !== busId);
            return [...prev, busId].filter((id) => allIds.includes(id));
          });
          setSoloAudioTrackIds([]);
        },
        onMuteClick: (e) => {
          e.stopPropagation();
          if (!draftProject) return;
          const bus = draftProject.audioBusses?.find((b) => b.id === busId);
          commitDraft(setAudioBusMuted(draftProject, busId, !bus?.muted));
        },
        onGainChange: (v) => {
          if (!draftProject) return;
          commitDraft(setAudioBusGainDb(draftProject, busId, v));
        },
        onGainReset: () => {
          if (!draftProject) return;
          commitDraft(setAudioBusGainDb(draftProject, busId, 0));
        },
        onPanChange: (v) => {
          if (!draftProject) return;
          commitDraft(setAudioBusPan(draftProject, busId, v));
        },
        onPanReset: () => {
          if (!draftProject) return;
          commitDraft(setAudioBusPan(draftProject, busId, 0));
        },
        onChannelModeChange: (mode) => {
          if (!draftProject) return;
          commitDraft(setAudioBusChannelMode(draftProject, busId, mode));
        },
        onOutputChange: (output) => {
          if (!draftProject) return;
          const bus = draftProject.audioBusses?.find((b) => b.id === busId);
          const prev =
            bus?.output?.kind === "hw_out" || bus?.output?.kind === "bus"
              ? bus.output
              : ({ kind: "master" } as const);
          if (isHwOutRepatchBlockedWhilePlaying(playing, prev, output)) {
            return;
          }
          commitDraft(setAudioBusOutput(draftProject, busId, output));
        },
        onNameDoubleClick: () => openBusRename(busId),
        onRenameChange: (name) => {
          setBusRename((prev) =>
            prev && prev.busId === busId ? { ...prev, name } : prev,
          );
        },
        onRenameCommit: commitBusRename,
        onRenameCancel: () => setBusRename(null),
      };
    },
    [
      setClipSelection,
      setTrackSelection,
      openBusContextMenu,
      draftProject,
      setSoloAudioTrackIds,
      commitDraft,
      playing,
      openBusRename,
      commitBusRename,
    ],
  );

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
    onAddAudioTrack,
    onRemoveAudioTrack,
    onDuplicateAudioTrack,
    openTrackRename,
    commitTrackRename,
    cancelTrackRename,
    openAudioTrackContextMenu,
    onAudioTrackHeaderClick,
    onAudioTrackSoloClick,
    onAudioTrackMuteClick,
    buildChannelStripCallbacks,
    buildMasterStripCallbacks,
    openBusRename,
    commitBusRename,
    openBusContextMenu,
    openHwContextMenu,
    onAddBus,
    onAddHwOut,
    onHwGainChange,
    onHwMuteToggle,
    onHwChannelModeChange,
    onHwSelect,
    onHwContextMenu,
    buildBusCallbacks,
  };
}
