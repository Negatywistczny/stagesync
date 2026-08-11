import { useCallback, useRef, useState, type RefObject } from "react";
import type { Project, SnapMode } from "@stagesync/shared";
import {
  clearSelection as clearClipSelectionHelper,
  clearTrackSelection,
  idsOnLane,
  isAudioSelectionLane,
  primaryLane,
  selectAllProjectClips,
  setSelection,
  type ClipSelection,
  type ClipSelectionLane,
  type TrackSelection,
} from "@lib/timeline/timelineSelection.js";
import {
  buildClipboardFromClips,
  deleteClipsOnLane,
  pasteClipboardAt,
  selectionMaxEndTicks,
  type TimelineClipboard,
} from "@lib/timeline/timelineClipboard.js";
import {
  joinFormaAtClick,
  splitFormaClipAt,
} from "@lib/timeline-edit/formaEdit.js";
import {
  joinAdjacentContentClips,
  splitContentClipAt,
} from "@lib/timeline-edit/contentLaneEdit.js";
import {
  joinAdjacentAudioClips,
  splitAudioClipAt,
} from "@lib/audio/audioLaneEdit.js";
import { applyTimelineNudge } from "@lib/timeline/timelineTouchNudge.js";
import { deleteScoreAnchor } from "@lib/timeline-edit/scoreBarEdit.js";
import { removeAudioHardwareOutput } from "@lib/audio/audioHwEdit.js";
import {
  removeAudioBus,
  removeAudioTrack,
} from "@lib/audio/audioTrackOperations.js";
import {
  ensureAudioTrackVisibility,
  type TrackVisibilityMap,
} from "@lib/timeline/timelineTracks.js";
import type { MapLaneId } from "@lib/timeline/mapLaneEdit.js";

export type UseTimelineSelectionStateParams = {
  draftRef: RefObject<Project | null>;
  commitDraft: (next: Project) => void;
  setSongMetaOpen: (open: boolean) => void;
  setLocatorTicks: (ticks: number) => void;
  setLoop: (loop: {
    enabled: boolean;
    startTicks: number;
    endTicks: number;
  }) => void | Promise<void>;
  snapMode: SnapMode;
  displayTicks: number;
  setSoloBusIds: (fn: (prev: string[]) => string[]) => void;
  setSoloAudioTrackIds: (fn: (prev: string[]) => string[]) => void;
  setTrackVisibility: (
    fn: (prev: TrackVisibilityMap) => TrackVisibilityMap,
  ) => void;
};

export function useTimelineSelectionState({
  draftRef,
  commitDraft,
  setSongMetaOpen,
  setLocatorTicks,
  setLoop,
  snapMode,
  displayTicks,
  setSoloBusIds,
  setSoloAudioTrackIds,
  setTrackVisibility,
}: UseTimelineSelectionStateParams) {
  const [clipSelection, setClipSelection] = useState<ClipSelection>(() =>
    clearClipSelectionHelper(),
  );
  const clipSelectionRef = useRef(clipSelection);
  clipSelectionRef.current = clipSelection;

  const [selectedMapLane, setSelectedMapLane] = useState<MapLaneId | null>(
    null,
  );
  const [selectedMapIds, setSelectedMapIds] = useState<string[]>([]);
  const [selectedAnchorId, setSelectedAnchorId] = useState<string | null>(null);
  const [selectedSubsectionIdx, setSelectedSubsectionIdx] = useState<
    number | null
  >(null);
  const [trackSelection, setTrackSelection] = useState<TrackSelection>(() =>
    clearTrackSelection(),
  );
  const trackSelectionRef = useRef(trackSelection);
  trackSelectionRef.current = trackSelection;

  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const selectedBusIdRef = useRef(selectedBusId);
  selectedBusIdRef.current = selectedBusId;

  const [selectedHwOutputId, setSelectedHwOutputId] = useState<string | null>(
    null,
  );
  const selectedHwOutputIdRef = useRef(selectedHwOutputId);
  selectedHwOutputIdRef.current = selectedHwOutputId;

  const clipboardRef = useRef<TimelineClipboard | null>(null);

  const clearMapSelection = useCallback(() => {
    setSelectedMapLane(null);
    setSelectedMapIds([]);
  }, []);

  const clearClipSelection = useCallback(() => {
    setClipSelection(clearClipSelectionHelper());
    setSelectedSubsectionIdx(null);
  }, []);

  const selectAllClips = useCallback(() => {
    const draft = draftRef.current;
    if (!draft) return;
    setClipSelection(selectAllProjectClips(draft));
    setSongMetaOpen(false);
    clearMapSelection();
    setSelectedAnchorId(null);
    setTrackSelection(clearTrackSelection());
    setSelectedBusId(null);
    setSelectedHwOutputId(null);
  }, [clearMapSelection, draftRef, setSongMetaOpen]);

  const deleteSelectedFormaClip = useCallback(() => {
    const draft = draftRef.current;
    if (!draft) return;

    if (selectedMapLane && selectedMapIds.length) {
      let next = draft;
      const idSet = new Set(selectedMapIds);
      if (selectedMapLane === "tempo") {
        next = {
          ...draft,
          tempoMap: draft.tempoMap.filter((e) => !idSet.has(e.id)),
        };
      } else if (selectedMapLane === "metrum") {
        next = {
          ...draft,
          meterMap: draft.meterMap.filter((e) => !idSet.has(e.id)),
        };
      } else if (selectedMapLane === "tonacja") {
        next = {
          ...draft,
          keyMap: (draft.keyMap ?? []).filter((e) => !idSet.has(e.id)),
        };
      }
      clearMapSelection();
      if (next !== draft) commitDraft(next);
      return;
    }

    if (selectedAnchorId) {
      const next = deleteScoreAnchor(draft, selectedAnchorId);
      if (next !== draft) commitDraft(next);
      setSelectedAnchorId(null);
      return;
    }

    if (!clipSelection.items.length) {
      const hwId = selectedHwOutputIdRef.current;
      if (hwId) {
        const next = removeAudioHardwareOutput(draft, hwId);
        if (next !== draft) commitDraft(next);
        setSelectedHwOutputId(null);
        return;
      }
      const busId = selectedBusIdRef.current;
      if (busId) {
        const next = removeAudioBus(draft, busId);
        if (next !== draft) commitDraft(next);
        setSelectedBusId(null);
        setSoloBusIds((prev) => prev.filter((id) => id !== busId));
        return;
      }
      const ids = trackSelectionRef.current.ids;
      if (!ids.length) return;
      let next = draft;
      for (const trackId of ids) {
        next = removeAudioTrack(next, trackId);
      }
      if (next === draft) return;
      commitDraft(next);
      setTrackSelection(clearTrackSelection());
      setSoloAudioTrackIds((prev) => prev.filter((id) => !ids.includes(id)));
      setTrackVisibility((prev) =>
        ensureAudioTrackVisibility(prev, next.audioTracks),
      );
      return;
    }

    let next = draft;
    const lanes = [
      ...new Set(clipSelection.items.map((i) => i.lane)),
    ] as ClipSelectionLane[];
    for (const lane of lanes) {
      const ids = idsOnLane(clipSelection, lane);
      if (!ids.length) continue;
      if (lane === "forma") {
        const hasCountdown = ids.some((id) => {
          const c = next.forma.clips.find((x) => x.id === id);
          return c?.kind === "countdown";
        });
        if (
          hasCountdown &&
          ids.length === 1 &&
          clipSelection.items.length === 1
        ) {
          return;
        }
        const filtered = ids.filter((id) => {
          const c = next.forma.clips.find((x) => x.id === id);
          return c && c.kind !== "countdown";
        });
        if (!filtered.length) continue;
        next = deleteClipsOnLane(next, "forma", filtered);
      } else {
        next = deleteClipsOnLane(next, lane, ids);
      }
    }
    if (next !== draft) commitDraft(next);
    clearClipSelection();
  }, [
    clearClipSelection,
    clearMapSelection,
    clipSelection,
    commitDraft,
    draftRef,
    selectedAnchorId,
    selectedMapIds,
    selectedMapLane,
    setSoloAudioTrackIds,
    setSoloBusIds,
    setTrackVisibility,
  ]);

  const copyClipSelection = useCallback((): boolean => {
    const draft = draftRef.current;
    if (!draft || !clipSelection.items.length) return false;
    const lane = primaryLane(clipSelection);
    if (!lane) return false;
    const idSet = new Set(idsOnLane(clipSelection, lane));
    let clips: Parameters<typeof buildClipboardFromClips>[1];
    if (lane === "forma") {
      clips = draft.forma.clips.filter(
        (c) => idSet.has(c.id) && c.kind === "section",
      );
    } else if (lane === "tekst") {
      clips = draft.tekst.clips.filter((c) => idSet.has(c.id));
    } else if (lane === "akordy") {
      clips = draft.akordy.clips.filter((c) => idSet.has(c.id));
    } else if (lane === "cue") {
      clips = draft.cue.clips.filter((c) => idSet.has(c.id));
    } else if (isAudioSelectionLane(lane)) {
      clips = draft.audioClips.filter((c) => idSet.has(c.id));
    } else {
      return false;
    }
    const board = buildClipboardFromClips(lane, clips);
    if (!board) return false;
    clipboardRef.current = board;
    return true;
  }, [clipSelection, draftRef]);

  const pasteClipClipboard = useCallback(
    (anchorTicks: number): boolean => {
      const draft = draftRef.current;
      const board = clipboardRef.current;
      if (!draft || !board) return false;
      const result = pasteClipboardAt(draft, board, anchorTicks);
      if (!result) return false;
      commitDraft(result.project);
      setClipSelection(
        setSelection(
          result.newIds.map((id) => ({ id, lane: board.lane })),
          result.newIds[result.newIds.length - 1]!,
        ),
      );
      setSelectedSubsectionIdx(null);
      clearMapSelection();
      setSelectedAnchorId(null);
      const maxEnd = selectionMaxEndTicks(
        board.items.map(
          (it: { startTicks: number; lengthTicks: number }, i: number) => ({
            id: result.newIds[i] ?? `n${i}`,
            startTicks:
              anchorTicks + (it.startTicks - board.items[0]!.startTicks),
            lengthTicks: it.lengthTicks,
          }),
        ),
      );
      setLocatorTicks(Math.max(0, maxEnd));
      return true;
    },
    [clearMapSelection, commitDraft, draftRef, setLocatorTicks],
  );

  const duplicateClipSelection = useCallback((): boolean => {
    const draft = draftRef.current;
    const lane = primaryLane(clipSelection);
    if (!draft || !lane || !clipSelection.items.length) return false;
    if (!copyClipSelection()) return false;
    const idSet = new Set(idsOnLane(clipSelection, lane));
    const clips = isAudioSelectionLane(lane)
      ? draft.audioClips.filter((c) => idSet.has(c.id))
      : lane === "forma"
        ? draft.forma.clips.filter(
            (c) => idSet.has(c.id) && c.kind === "section",
          )
        : lane === "tekst"
          ? draft.tekst.clips.filter((c) => idSet.has(c.id))
          : lane === "akordy"
            ? draft.akordy.clips.filter((c) => idSet.has(c.id))
            : draft.cue.clips.filter((c) => idSet.has(c.id));
    return pasteClipClipboard(selectionMaxEndTicks(clips));
  }, [clipSelection, copyClipSelection, draftRef, pasteClipClipboard]);

  const cutClipSelection = useCallback((): boolean => {
    if (!copyClipSelection()) return false;
    deleteSelectedFormaClip();
    return true;
  }, [copyClipSelection, deleteSelectedFormaClip]);

  const splitSelectionAtPlayhead = useCallback((): boolean => {
    const draft = draftRef.current;
    const lane = primaryLane(clipSelection);
    const id = clipSelection.primaryId;
    if (!draft || !lane || !id) return false;
    const at = displayTicks;
    let next: typeof draft;
    if (lane === "forma") {
      next = splitFormaClipAt(draft, id, at);
    } else if (lane === "tekst" || lane === "akordy" || lane === "cue") {
      next = splitContentClipAt(draft, lane, id, at);
    } else if (isAudioSelectionLane(lane)) {
      next = splitAudioClipAt(draft, id, at);
    } else {
      return false;
    }
    if (next === draft) return false;
    commitDraft(next);
    return true;
  }, [clipSelection, commitDraft, displayTicks, draftRef]);

  const joinSelectionAdjacent = useCallback((): boolean => {
    const draft = draftRef.current;
    const lane = primaryLane(clipSelection);
    const id = clipSelection.primaryId;
    if (!draft || !lane || !id) return false;
    let next: typeof draft;
    if (lane === "forma") {
      next = joinFormaAtClick(draft, id, displayTicks);
    } else if (lane === "tekst" || lane === "akordy" || lane === "cue") {
      next = joinAdjacentContentClips(draft, lane, id);
    } else if (isAudioSelectionLane(lane)) {
      next = joinAdjacentAudioClips(draft, id);
    } else {
      return false;
    }
    if (next === draft) return false;
    commitDraft(next);
    return true;
  }, [clipSelection, commitDraft, displayTicks, draftRef]);

  const setCycleFromSelectedAudioClip = useCallback((): boolean => {
    const draft = draftRef.current;
    const lane = primaryLane(clipSelection);
    const id = clipSelection.primaryId;
    if (!draft || !id || !isAudioSelectionLane(lane)) return false;
    const clip = draft.audioClips.find((c) => c.id === id);
    if (!clip || clip.lengthTicks < 1) return false;
    void setLoop({
      enabled: true,
      startTicks: clip.startTicks,
      endTicks: clip.startTicks + clip.lengthTicks,
    });
    return true;
  }, [clipSelection, draftRef, setLoop]);

  const nudgeSelectedClip = useCallback(
    (dir: -1 | 1) => {
      const draft = draftRef.current;
      const lane = primaryLane(clipSelection);
      const id = clipSelection.primaryId;
      if (!draft || !lane || !id) return;
      const next = applyTimelineNudge(
        draft,
        lane,
        id,
        dir < 0 ? "move-left" : "move-right",
        snapMode,
      );
      if (next !== draft) commitDraft(next);
    },
    [clipSelection, commitDraft, draftRef, snapMode],
  );

  return {
    clipSelection,
    setClipSelection,
    clipSelectionRef,
    clearClipSelection,
    selectedMapLane,
    setSelectedMapLane,
    selectedMapIds,
    setSelectedMapIds,
    clearMapSelection,
    selectedAnchorId,
    setSelectedAnchorId,
    selectedSubsectionIdx,
    setSelectedSubsectionIdx,
    trackSelection,
    setTrackSelection,
    trackSelectionRef,
    selectedBusId,
    setSelectedBusId,
    selectedBusIdRef,
    selectedHwOutputId,
    setSelectedHwOutputId,
    selectedHwOutputIdRef,
    clipboardRef,
    selectAllClips,
    deleteSelectedFormaClip,
    copyClipSelection,
    cutClipSelection,
    pasteClipClipboard,
    duplicateClipSelection,
    splitSelectionAtPlayhead,
    joinSelectionAdjacent,
    setCycleFromSelectedAudioClip,
    nudgeSelectedClip,
  };
}
