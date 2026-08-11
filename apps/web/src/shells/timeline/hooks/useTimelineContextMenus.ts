import { useCallback, type RefObject, type Dispatch, type SetStateAction } from "react";
import { flushSync } from "react-dom";
import type { Project } from "@stagesync/shared";
import {
  buildClipboardFromClips,
  deleteClipsOnLane,
  type TimelineClipboard,
} from "@lib/timeline/timelineClipboard.js";
import {
  clearSelection,
  idsOnLane,
  isClipSelected,
  setSelection,
  type ClipSelection,
  type ClipSelectionLane,
} from "@lib/timeline/timelineSelection.js";
import {
  buildClipContextMenuItems,
  buildEmptyLaneContextMenuItems,
  clipboardMatchesEmptyLane,
  clipContextMenuLabel,
  type ClipMenuLane,
  type EmptyLaneMenuKind,
} from "@lib/timeline/timelineContextMenus.js";
import {
  deleteFormaClip,
  splitFormaClipAt,
} from "@lib/timeline-edit/formaEdit.js";
import {
  deleteTekstClip,
  pencilTekstClick,
} from "@lib/timeline-edit/tekstEdit.js";
import {
  deleteAkordyClip,
  pencilAkordyClick,
} from "@lib/timeline-edit/akordyEdit.js";
import {
  deleteCueClip,
  pencilCueClick,
} from "@lib/timeline-edit/cueEdit.js";
import { splitContentClipAt } from "@lib/timeline-edit/contentLaneEdit.js";
import {
  setAudioClipMuted,
  splitAudioClipAt,
} from "@lib/audio/audioLaneEdit.js";
import { pencilFormaClick } from "@lib/timeline-edit/formaCanvas.js";

export type UseTimelineContextMenusOptions = {
  isMobilePreview: boolean;
  setTouchAlertOpen: (v: boolean) => void;
  clearMapSelection: () => void;
  clipSelectionRef: RefObject<ClipSelection>;
  setClipSelection: Dispatch<SetStateAction<ClipSelection>>;
  setSelectedSubsectionIdx: (idx: number | null) => void;
  setSelectedAnchorId: (id: string | null) => void;
  setSongMetaOpen: (open: boolean) => void;
  setInspectorVisible: (v: boolean) => void;
  selectLaneClip: (lane: ClipSelectionLane, id: string) => void;
  clipboardRef: RefObject<TimelineClipboard | null>;
  rawTicksAtClientX: (clientX: number) => number | null;
  draftRef: RefObject<Project | null>;
  commitDraft: (next: Project) => void;
  copyClipSelection: () => boolean;
  deleteSelectedFormaClip: () => void;
  duplicateClipSelection: () => void;
  pasteClipClipboard: (targetTicks: number) => void;
  focusInspectorPanel: () => void;
  openContextMenu: (args: any) => void;
  laneImportTrackIdRef: RefObject<string | null>;
  laneImportStartTicksRef: RefObject<number | null>;
  laneAudioFileRef: RefObject<HTMLInputElement | null>;
  locatorTicks: number;
};

export function useTimelineContextMenus({
  isMobilePreview,
  setTouchAlertOpen,
  clearMapSelection,
  clipSelectionRef,
  setClipSelection,
  setSelectedSubsectionIdx,
  setSelectedAnchorId,
  setSongMetaOpen,
  setInspectorVisible,
  selectLaneClip,
  clipboardRef,
  rawTicksAtClientX,
  draftRef,
  commitDraft,
  copyClipSelection,
  deleteSelectedFormaClip,
  duplicateClipSelection,
  pasteClipClipboard,
  focusInspectorPanel,
  openContextMenu,
  laneImportTrackIdRef,
  laneImportStartTicksRef,
  laneAudioFileRef,
  locatorTicks,
}: UseTimelineContextMenusOptions) {
  const openClipContextMenu = useCallback((args: {
    clientX: number;
    clientY: number;
    lane: ClipMenuLane;
    clipId: string;
    clipMuted?: boolean;
    canSplit: boolean;
    canDelete?: boolean;
    selectionLane: ClipSelectionLane;
  }) => {
    if (isMobilePreview) {
      setTouchAlertOpen(true);
      return;
    }
    const {
      clientX,
      clientY,
      lane,
      clipId,
      clipMuted,
      canSplit,
      canDelete = true,
    } = args;
    clearMapSelection();
    const prev = clipSelectionRef.current ?? { items: [], primaryId: null };
    const alreadySelected = isClipSelected(prev, clipId, args.selectionLane);
    const onLaneIds = alreadySelected
      ? idsOnLane(prev, args.selectionLane)
      : [];
    const multiIds = onLaneIds.length > 1 ? onLaneIds : null;
    const selectionCount = multiIds?.length ?? 1;
    flushSync(() => {
      if (multiIds) {
        setClipSelection(setSelection(prev.items, clipId));
        setSelectedSubsectionIdx(null);
        setSelectedAnchorId(null);
        setSongMetaOpen(false);
        setInspectorVisible(true);
      } else {
        selectLaneClip(args.selectionLane, clipId);
      }
    });
    const board = clipboardRef.current;
    const canPaste = Boolean(board);
    const splitTicks = rawTicksAtClientX(clientX);

    const copyThisClip = (): boolean => {
      const draft = draftRef.current;
      if (!draft) return false;
      let clips: Parameters<typeof buildClipboardFromClips>[1] = [];
      if (lane === "forma") {
        const c = draft.forma.clips.find(
          (x) => x.id === clipId && x.kind === "section",
        );
        if (c) clips = [c];
      } else if (lane === "tekst") {
        const c = draft.tekst?.clips.find((x) => x.id === clipId);
        if (c) clips = [c];
      } else if (lane === "akordy") {
        const c = draft.akordy?.clips.find((x) => x.id === clipId);
        if (c) clips = [c];
      } else if (lane === "cue") {
        const c = draft.cue?.clips.find((x) => x.id === clipId);
        if (c) clips = [c];
      } else if (lane === "audio") {
        const c = draft.audioClips.find((x) => x.id === clipId);
        if (c) clips = [c];
      }
      const nextBoard = buildClipboardFromClips(args.selectionLane, clips);
      if (!nextBoard) return false;
      clipboardRef.current = nextBoard;
      return true;
    };

    const deleteThisClip = () => {
      const draft = draftRef.current;
      if (!draft || !canDelete) return;
      if (lane === "forma") {
        const next = deleteFormaClip(draft, clipId);
        if (next !== draft) commitDraft(next);
      } else if (lane === "tekst") {
        commitDraft(deleteTekstClip(draft, clipId));
      } else if (lane === "akordy") {
        commitDraft(deleteAkordyClip(draft, clipId));
      } else if (lane === "cue") {
        commitDraft(deleteCueClip(draft, clipId));
      } else if (lane === "audio") {
        const next = deleteClipsOnLane(draft, args.selectionLane, [clipId]);
        if (next !== draft) commitDraft(next);
      }
      setClipSelection(clearSelection());
    };

    openContextMenu({
      x: clientX,
      y: clientY,
      label: clipContextMenuLabel(selectionCount),
      items: buildClipContextMenuItems({
        lane,
        canPaste,
        canSplit: canSplit && splitTicks != null && !multiIds,
        clipMuted,
        onCopy: () => {
          if (multiIds) {
            copyClipSelection();
            return;
          }
          copyThisClip();
        },
        onCut: () => {
          if (multiIds) {
            if (!copyClipSelection()) return;
            deleteSelectedFormaClip();
            return;
          }
          if (!canDelete) return;
          if (!copyThisClip()) return;
          deleteThisClip();
        },
        onPaste: () => {
          pasteClipClipboard(locatorTicks);
        },
        onDuplicate: () => {
          if (multiIds) {
            duplicateClipSelection();
            return;
          }
          if (!copyThisClip()) return;
          const draft = draftRef.current;
          if (!draft) return;
          let end = 0;
          if (lane === "forma") {
            const c = draft.forma.clips.find((x) => x.id === clipId);
            if (c) end = c.startTicks + c.lengthTicks;
          } else if (lane === "tekst") {
            const c = draft.tekst?.clips.find((x) => x.id === clipId);
            if (c) end = c.startTicks + c.lengthTicks;
          } else if (lane === "akordy") {
            const c = draft.akordy?.clips.find((x) => x.id === clipId);
            if (c) end = c.startTicks + c.lengthTicks;
          } else if (lane === "cue") {
            const c = draft.cue?.clips.find((x) => x.id === clipId);
            if (c) end = c.startTicks + c.lengthTicks;
          } else if (lane === "audio") {
            const c = draft.audioClips.find((x) => x.id === clipId);
            if (c) end = c.startTicks + c.lengthTicks;
          }
          pasteClipClipboard(end);
        },
        onDelete: () => {
          if (multiIds) {
            deleteSelectedFormaClip();
            return;
          }
          deleteThisClip();
        },
        onMuteToggle:
          lane === "audio"
            ? () => {
                const draft = draftRef.current;
                if (!draft) return;
                const clip = draft.audioClips.find((c) => c.id === clipId);
                if (!clip) return;
                commitDraft(setAudioClipMuted(draft, clipId, !clip.muted));
              }
            : undefined,
        onFocusInspector: () => focusInspectorPanel(),
        onSplit:
          canSplit && splitTicks != null && !multiIds
            ? () => {
                const draft = draftRef.current;
                if (!draft) return;
                if (lane === "forma") {
                  const next = splitFormaClipAt(draft, clipId, splitTicks);
                  if (next !== draft) commitDraft(next);
                  return;
                }
                if (lane === "tekst" || lane === "akordy" || lane === "cue") {
                  const next = splitContentClipAt(
                    draft,
                    lane,
                    clipId,
                    splitTicks,
                  );
                  if (next !== draft) commitDraft(next);
                  return;
                }
                if (lane === "audio") {
                  const next = splitAudioClipAt(draft, clipId, splitTicks);
                  if (next !== draft) commitDraft(next);
                }
              }
            : undefined,
      }).map((item) => {
        if (!("id" in item)) return item;
        if (
          !canDelete &&
          (item.id === "cut" || item.id === "delete" || item.id === "duplicate")
        ) {
          return { ...item, disabled: true };
        }
        return item;
      }),
    });
  }, [
    isMobilePreview,
    setTouchAlertOpen,
    clearMapSelection,
    clipSelectionRef,
    rawTicksAtClientX,
    clipboardRef,
    setClipSelection,
    setSelectedSubsectionIdx,
    setSelectedAnchorId,
    setSongMetaOpen,
    setInspectorVisible,
    selectLaneClip,
    draftRef,
    commitDraft,
    openContextMenu,
    copyClipSelection,
    deleteSelectedFormaClip,
    pasteClipClipboard,
    duplicateClipSelection,
    focusInspectorPanel,
    locatorTicks,
  ]);

  const openEmptyLaneContextMenu = useCallback((args: {
    clientX: number;
    clientY: number;
    laneKind: EmptyLaneMenuKind;
    audioTrackId?: string;
  }) => {
    if (isMobilePreview) {
      setTouchAlertOpen(true);
      return;
    }
    const { clientX, clientY, laneKind, audioTrackId } = args;
    const ticks = rawTicksAtClientX(clientX);
    if (ticks == null) return;
    const board = clipboardRef.current;
    const canPaste = clipboardMatchesEmptyLane(board?.lane, laneKind);
    openContextMenu({
      x: clientX,
      y: clientY,
      label: "Menu ścieżki",
      items: buildEmptyLaneContextMenuItems({
        lane: laneKind,
        canPaste,
        onPaste: () => {
          pasteClipClipboard(ticks);
        },
        onImportAudio:
          laneKind === "audio" && audioTrackId
            ? () => {
                if (laneImportTrackIdRef.current !== undefined) {
                  (laneImportTrackIdRef as any).current = audioTrackId;
                }
                if (laneImportStartTicksRef.current !== undefined) {
                  (laneImportStartTicksRef as any).current = null;
                }
                laneAudioFileRef.current?.click();
              }
            : undefined,
        onAddClip:
          laneKind === "forma"
            ? () => {
                const draft = draftRef.current;
                if (!draft) return;
                const n =
                  draft.forma.clips.filter((c) => c.kind === "section").length +
                  1;
                const next = pencilFormaClick(draft, ticks, `Sekcja ${n}`);
                if (next !== draft) commitDraft(next);
              }
            : laneKind === "tekst"
              ? () => {
                  const draft = draftRef.current;
                  if (!draft) return;
                  const next = pencilTekstClick(draft, ticks, "…");
                  if (next !== draft) commitDraft(next);
                }
              : laneKind === "akordy"
                ? () => {
                    const draft = draftRef.current;
                    if (!draft) return;
                    const next = pencilAkordyClick(draft, ticks, "C");
                    if (next !== draft) commitDraft(next);
                  }
                : laneKind === "cue"
                  ? () => {
                      const draft = draftRef.current;
                      if (!draft) return;
                      const next = pencilCueClick(draft, ticks, "Cue");
                      if (next !== draft) commitDraft(next);
                    }
                  : undefined,
      }),
    });
  }, [
    isMobilePreview,
    setTouchAlertOpen,
    rawTicksAtClientX,
    clipboardRef,
    openContextMenu,
    pasteClipClipboard,
    laneImportTrackIdRef,
    laneImportStartTicksRef,
    laneAudioFileRef,
    draftRef,
    commitDraft,
  ]);

  return {
    openClipContextMenu,
    openEmptyLaneContextMenu,
  };
}
