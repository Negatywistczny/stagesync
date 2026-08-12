import { useState, useCallback } from "react";
import type { Project } from "@stagesync/shared";
import { isHwOutRepatchBlockedWhilePlaying } from "@stagesync/shared";
import type {
  ChannelStripCallbacks,
  MasterStripCallbacks,
} from "../channelStrip/channelStripTypes.js";
import {
  setAudioTrackGainDb,
  setAudioTrackPan,
  setAudioTrackChannelMode,
  setAudioTrackColor,
  setAudioTrackIcon,
  setAudioTrackOutput,
  setMasterGainDb,
  setAudioBusName,
  removeAudioBus,
  addAudioBus,
  setAudioBusMuted,
  setAudioBusGainDb,
  setAudioBusPan,
  setAudioBusChannelMode,
  setAudioBusOutput,
} from "@lib/audio/audioTrackOperations.js";
import {
  addAudioHardwareOutput,
  removeAudioHardwareOutput,
  updateAudioHardwareOutput,
  canAddHardwareOutput,
  setMasterOutputRouting,
} from "@lib/audio/audioHwEdit.js";
import { getAudioHwCapability } from "@lib/audio/audioHwCapability.js";
import {
  clearSelection,
  clearTrackSelection,
  type ClipSelection,
  type TrackSelection,
} from "@lib/timeline/timelineSelection.js";

export type ContextMenuItem = {
  id: string;
  label: string;
  danger?: boolean;
  onSelect: () => void;
};

export type ContextMenuConfig = {
  x: number;
  y: number;
  label: string;
  items: ContextMenuItem[];
};

export type UseTimelineDockCallbacksOptions = {
  draftProject: Project | null;
  commitDraft: (p: Project) => void;
  state: { playing: boolean };
  setLoadError: (err: string | null) => void;
  onAudioTrackHeaderClick: (e: React.MouseEvent, trackId: string) => void;
  openAudioTrackContextMenu: (
    trackId: string,
    clientX: number,
    clientY: number,
  ) => void;
  onAudioTrackSoloClick: (e: React.MouseEvent, trackId: string) => void;
  onAudioTrackMuteClick: (e: React.MouseEvent, trackId: string) => void;
  openTrackRename: (trackId: string) => void;
  setTrackRename: React.Dispatch<
    React.SetStateAction<{ trackId: string; name: string } | null>
  >;
  commitTrackRename: () => void;
  cancelTrackRename: () => void;
  setClipSelection: React.Dispatch<React.SetStateAction<ClipSelection>>;
  setTrackSelection: React.Dispatch<React.SetStateAction<TrackSelection>>;
  setSelectedBusId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedHwOutputId: React.Dispatch<React.SetStateAction<string | null>>;
  setSoloBusIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSoloAudioTrackIds: React.Dispatch<React.SetStateAction<string[]>>;
  openContextMenu: (menu: ContextMenuConfig) => void;
};

export function useTimelineDockCallbacks({
  draftProject,
  commitDraft,
  state,
  setLoadError,
  onAudioTrackHeaderClick,
  openAudioTrackContextMenu,
  onAudioTrackSoloClick,
  onAudioTrackMuteClick,
  openTrackRename,
  setTrackRename,
  commitTrackRename,
  cancelTrackRename,
  setClipSelection,
  setTrackSelection,
  setSelectedBusId,
  setSelectedHwOutputId,
  setSoloBusIds,
  setSoloAudioTrackIds,
  openContextMenu,
}: UseTimelineDockCallbacksOptions) {
  const [busRename, setBusRename] = useState<{
    busId: string;
    name: string;
  } | null>(null);

  const openBusRename = useCallback(
    (busId: string) => {
      const name =
        draftProject?.audioBusses?.find((b) => b.id === busId)?.name ?? "";
      setBusRename({ busId, name });
    },
    [draftProject],
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
      setSelectedHwOutputId,
      setSelectedBusId,
      openContextMenu,
      openBusRename,
      draftProject,
      commitDraft,
      setSoloBusIds,
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
          if (isHwOutRepatchBlockedWhilePlaying(state.playing, prev, output)) {
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
      state.playing,
      openTrackRename,
      setTrackRename,
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
        if (!draftProject || state.playing) return;
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
  }, [draftProject, commitDraft, state.playing, setLoadError]);

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
          if (isHwOutRepatchBlockedWhilePlaying(state.playing, prev, output)) {
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
      setSelectedHwOutputId,
      setSelectedBusId,
      openBusContextMenu,
      draftProject,
      setSoloBusIds,
      setSoloAudioTrackIds,
      commitDraft,
      state.playing,
      openBusRename,
      commitBusRename,
    ],
  );

  return {
    busRename,
    setBusRename,
    openBusRename,
    commitBusRename,
    openBusContextMenu,
    openHwContextMenu,
    buildChannelStripCallbacks,
    buildMasterStripCallbacks,
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
