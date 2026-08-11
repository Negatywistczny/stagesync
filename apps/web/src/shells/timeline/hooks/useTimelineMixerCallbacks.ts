import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Project } from "@stagesync/shared";
import {
  setAudioTrackGainDb,
  setAudioTrackPan,
  setAudioTrackChannelMode,
  setAudioTrackColor,
  setAudioTrackIcon,
  setAudioTrackOutput,
  setMasterGainDb,
  setAudioBusMuted,
  setAudioBusGainDb,
  setAudioBusPan,
  setAudioBusChannelMode,
  setAudioBusOutput,
} from "@lib/audio/audioLaneEdit.js";
import { setMasterOutputRouting } from "@lib/audio/audioHwEdit.js";
import { isHwOutRepatchBlockedWhilePlaying } from "@stagesync/shared";
import {
  clearSelection,
  clearTrackSelection,
  type ClipSelection,
  type TrackSelection,
} from "@lib/timeline/timelineSelection.js";
import type {
  ChannelStripCallbacks,
  MasterStripCallbacks,
} from "../channelStrip/channelStripTypes.js";

export type UseTimelineMixerCallbacksOptions = {
  draftProject: Project | null;
  commitDraft: (next: Project) => void;
  playing: boolean;
  setClipSelection: Dispatch<SetStateAction<ClipSelection>>;
  setTrackSelection: Dispatch<SetStateAction<TrackSelection>>;
  setSelectedBusId: Dispatch<SetStateAction<string | null>>;
  setSelectedHwOutputId: Dispatch<SetStateAction<string | null>>;
  setSoloBusIds: Dispatch<SetStateAction<string[]>>;
  setSoloAudioTrackIds: Dispatch<SetStateAction<string[]>>;
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
  setTrackRename: Dispatch<
    SetStateAction<{ trackId: string; name: string } | null>
  >;
  commitTrackRename: () => void;
  cancelTrackRename: () => void;
  openBusContextMenu: (busId: string, clientX: number, clientY: number) => void;
  openBusRename: (busId: string) => void;
  setBusRename: Dispatch<
    SetStateAction<{ busId: string; name: string } | null>
  >;
  commitBusRename: () => void;
};

export function useTimelineMixerCallbacks({
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
}: UseTimelineMixerCallbacksOptions) {
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
      setSelectedHwOutputId,
      setSelectedBusId,
      openBusContextMenu,
      draftProject,
      setSoloBusIds,
      setSoloAudioTrackIds,
      commitDraft,
      playing,
      openBusRename,
      setBusRename,
      commitBusRename,
    ],
  );

  return {
    buildChannelStripCallbacks,
    buildMasterStripCallbacks,
    buildBusCallbacks,
  };
}
