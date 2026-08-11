/* eslint-disable max-lines */
import { useState, useRef, useEffect, useCallback, type RefObject } from "react";
import type { Project, FormaClip } from "@stagesync/shared";
import {
  toolAllowsClipHitZones,
  toolIsPencilDraw,
  toolUsesMarqueeGesture,
  isTouchPointerType,
  hitTestClipZone,
  hitTestAudioClipZone,
  type FormaGesturePreview,
  type FormaGestureSession,
} from "@lib/timeline/timelineGesture.js";
import {
  cascadeFormaMoveIds,
  commitGesture,
  deleteFormaClip,
  formaSectionCoveringTicks,
  joinFormaAtClick,
  previewFromSession,
  splitFormaClipAt,
} from "@lib/timeline-edit/formaEdit.js";
import {
  commitContentGesture,
  joinAdjacentContentClips,
  previewContentFromSession,
  splitContentClipAt,
  type ContentLaneId,
} from "@lib/timeline-edit/contentLaneEdit.js";
import { deleteTekstClip } from "@lib/timeline-edit/tekstEdit.js";
import { deleteAkordyClip } from "@lib/timeline-edit/akordyEdit.js";
import { deleteCueClip } from "@lib/timeline-edit/cueEdit.js";
import {
  audioTrackIdFromLane,
  isAudioLaneId,
  type AudioLaneId,
} from "@lib/timeline/timelineTracks.js";
import {
  commitAudioGesture,
  previewAudioFromSession,
} from "@lib/audio/audioGestureOperations.js";
import {
  joinAdjacentAudioClips,
  splitAudioClipAt,
  toggleAudioClipMute,
} from "@lib/audio/audioClipOperations.js";
import {
  idsOnLane,
  isClipSelected,
  isMultiSelectClick,
  resolveMoveIds,
  selectRangeTo,
  selectionIdsAfterFormaMove,
  setSelection,
  toggleSelected,
  type ClipSelection,
  type ClipSelectionLane,
} from "@lib/timeline/timelineSelection.js";
import {
  buildClipboardFromClips,
  deleteClipsOnLane,
  pasteClipboardWithDelta,
} from "@lib/timeline/timelineClipboard.js";
import { subsectionRanges } from "@lib/timeline-edit/formaSubsections.js";
import type { ToolId } from "../timelineToolsData.js";

export type UseTimelineFormaGesturesOptions = {
  draftRef: RefObject<Project | null>;
  draftProject: Project | null;
  commitDraft: (p: Project) => void;
  rawTicksAtClientX: (clientX: number) => number | null;
  tool: ToolId;
  gesturePolicy: {
    pencilDraw: boolean;
    clipDragResize: boolean;
  };
  setTouchAlertOpen: (v: boolean) => void;
  clipSelection: ClipSelection;
  setClipSelection: React.Dispatch<React.SetStateAction<ClipSelection>>;
  clearClipSelection: () => void;
  selectLaneClip: (lane: ClipSelectionLane, clipId: string) => void;
  selectedClipId: string | null;
  clearMapSelection: () => void;
  setSelectedAnchorId: (id: string | null) => void;
  setSongMetaOpen: (v: boolean) => void;
  setSelectedSubsectionIdx: (idx: number | null) => void;
  deleteSelectedFormaClip: () => void;
  beginMarquee: (e: React.PointerEvent<HTMLElement>) => void;
  beginTouchCanvasNav: (e: React.PointerEvent<HTMLElement>) => void;
  heldZoomRef: RefObject<boolean>;
  zoomHRef: RefObject<number>;
  effectiveZoomH: number;
  soloAudioTrackIds: string[];
  setSoloAudioTrackIds: React.Dispatch<React.SetStateAction<string[]>>;
  soloHoldRef: React.MutableRefObject<string[] | null>;
  setCanvasNotice: (msg: string | null) => void;
  canvasNoticeTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
};

export function useTimelineFormaGestures({
  draftRef,
  draftProject,
  commitDraft,
  rawTicksAtClientX,
  tool,
  gesturePolicy,
  setTouchAlertOpen,
  clipSelection,
  setClipSelection,
  clearClipSelection,
  selectLaneClip,
  selectedClipId,
  clearMapSelection,
  setSelectedAnchorId,
  setSongMetaOpen,
  setSelectedSubsectionIdx,
  deleteSelectedFormaClip,
  beginMarquee,
  beginTouchCanvasNav,
  heldZoomRef,
  zoomHRef,
  effectiveZoomH,
  soloAudioTrackIds,
  setSoloAudioTrackIds,
  soloHoldRef,
  setCanvasNotice,
  canvasNoticeTimerRef,
}: UseTimelineFormaGesturesOptions) {
  const gestureSessionRef = useRef<FormaGestureSession | null>(null);
  const gesturePreviewRef = useRef<FormaGesturePreview | null>(null);
  const [gestureSession, setGestureSession] = useState<FormaGestureSession | null>(null);
  const [gesturePreview, setGesturePreview] = useState<FormaGesturePreview | null>(null);

  const beginFormaGesture = useCallback(
    (session: FormaGestureSession, preview: FormaGesturePreview) => {
      gestureSessionRef.current = session;
      gesturePreviewRef.current = preview;
      setGestureSession(session);
      setGesturePreview(preview);
    },
    [],
  );

  const updateFormaGesturePreview = useCallback(
    (
      rawTicks: number,
      metaKey: boolean,
      ctrlKey: boolean,
      clientX?: number,
      clientY?: number,
    ) => {
      const session = gestureSessionRef.current;
      const draft = draftRef.current;
      if (!session || !draft) return;
      const lane = session.lane ?? "forma";

      if (isAudioLaneId(lane)) {
        let targetAudioLane: AudioLaneId | undefined = undefined;
        if (typeof window !== "undefined" && clientX != null && clientY != null) {
          const elem = document.elementFromPoint(clientX, clientY);
          const laneElem = elem?.closest("[data-audio-lane]");
          if (laneElem) {
            const laneId = laneElem.getAttribute("data-audio-lane");
            if (laneId && isAudioLaneId(laneId)) {
              targetAudioLane = laneId as AudioLaneId;
            }
          }
        }
        const preview = previewAudioFromSession(
          draft,
          session,
          rawTicks,
          metaKey,
          ctrlKey,
          clientY,
          targetAudioLane,
        );
        gesturePreviewRef.current = preview;
        setGesturePreview(preview);
        return;
      }

      if (lane !== "forma") {
        const preview = previewContentFromSession(
          draft,
          session,
          rawTicks,
          metaKey,
          ctrlKey,
          clientX,
        );
        gesturePreviewRef.current = preview;
        setGesturePreview(preview);
        return;
      }

      const n = draft.forma.clips.filter((c) => c.kind === "section").length + 1;
      const preview = previewFromSession(
        draft,
        session,
        rawTicks,
        metaKey,
        ctrlKey,
        `Sekcja ${n}`,
        clientX,
        zoomHRef.current,
      );
      gesturePreviewRef.current = preview;
      setGesturePreview(preview);
    },
    [draftRef, zoomHRef],
  );

  const endFormaGesture = useCallback(
    (metaKey: boolean, ctrlKey: boolean) => {
      const session = gestureSessionRef.current;
      const preview = gesturePreviewRef.current;
      const draft = draftRef.current;
      gestureSessionRef.current = null;
      gesturePreviewRef.current = null;
      setGestureSession(null);
      setGesturePreview(null);
      if (!session || !preview || !draft) return;
      const lane = session.lane ?? "forma";

      if (
        session.optionCopy &&
        session.kind === "move" &&
        session.clipId &&
        preview.startTicks !== session.originClipStart
      ) {
        if (isAudioLaneId(lane)) return;
        const moveIds = session.moveIds?.length
          ? session.moveIds
          : [session.clipId];
        const idSet = new Set(moveIds);
        const clips =
          lane === "forma"
            ? draft.forma.clips.filter(
                (c) => idSet.has(c.id) && c.kind === "section",
              )
            : lane === "tekst"
              ? draft.tekst.clips.filter((c) => idSet.has(c.id))
              : lane === "akordy"
                ? draft.akordy.clips.filter((c) => idSet.has(c.id))
                : draft.cue.clips.filter((c) => idSet.has(c.id));
        const board = buildClipboardFromClips(lane, clips);
        if (!board) return;
        const delta = preview.startTicks - session.originClipStart;
        const result = pasteClipboardWithDelta(draft, board, delta);
        if (!result) return;
        commitDraft(result.project);
        if (result.newIds.length) {
          setClipSelection(
            setSelection(
              result.newIds.map((id) => ({ id, lane })),
              result.newIds[0]!,
            ),
          );
        }
        return;
      }

      if (isAudioLaneId(lane)) {
        const destLane = (
          preview.targetLane && isAudioLaneId(preview.targetLane)
            ? preview.targetLane
            : lane
        ) as AudioLaneId;
        const next = commitAudioGesture(
          draft,
          lane as AudioLaneId,
          session,
          preview,
          metaKey,
          ctrlKey,
          destLane,
        );
        commitDraft(next);
        if (session.kind === "move" && session.moveIds?.length) {
          setClipSelection((prev) =>
            setSelection(
              [
                ...prev.items.filter(
                  (i) => i.lane !== lane && i.lane !== destLane,
                ),
                ...session.moveIds!.map((id: string) => ({ id, lane: destLane })),
              ],
              session.clipId,
            ),
          );
          return;
        }
        if (session.clipId) selectLaneClip(destLane, session.clipId);
        return;
      }

      if (lane !== "forma") {
        const next = commitContentGesture(
          draft,
          lane,
          session,
          preview,
          metaKey,
          ctrlKey,
        );
        commitDraft(next);
        if (session.kind === "pencil-draw") {
          const clips =
            lane === "tekst"
              ? next.tekst.clips
              : lane === "akordy"
                ? next.akordy.clips
                : next.cue.clips;
          const created = clips.find(
            (c) =>
              c.startTicks === preview.startTicks &&
              c.lengthTicks === preview.lengthTicks,
          );
          if (created?.id) selectLaneClip(lane, created.id);
          else clearClipSelection();
          return;
        }
        if (session.kind === "move" && session.moveIds?.length) {
          setClipSelection((prev) =>
            setSelection(
              [
                ...prev.items.filter((i) => i.lane !== lane),
                ...session.moveIds!.map((id: string) => ({ id, lane })),
              ],
              session.clipId,
            ),
          );
          return;
        }
        if (session.clipId) {
          selectLaneClip(lane, session.clipId);
        }
        return;
      }

      const next = commitGesture(draft, session, preview, metaKey, ctrlKey);
      commitDraft(next);
      if (session.kind === "pencil-draw") {
        const created = next.forma.clips.find(
          (c) =>
            c.kind === "section" &&
            c.startTicks === preview.startTicks &&
            c.lengthTicks === preview.lengthTicks,
        );
        if (created) {
          selectLaneClip("forma", created.id);
        }
      } else if (session.kind === "subsection-boundary" && session.clipId) {
        selectLaneClip("forma", session.clipId);
        const clip = next.forma.clips.find((c) => c.id === session.clipId);
        const ranges = subsectionRanges(
          clip?.subsections,
          clip?.lengthTicks ?? 1,
        );
        const maxIdx = Math.max(0, ranges.length - 1);
        const countBefore =
          session.originBoundaryRel != null
            ? subsectionRanges(
                draft.forma.clips.find((c) => c.id === session.clipId)
                  ?.subsections,
                session.originClipLength,
              ).length
            : ranges.length;
        if (ranges.length < countBefore && session.boundarySubIdx != null) {
          setSelectedSubsectionIdx(
            Math.max(0, Math.min(session.boundarySubIdx - 1, maxIdx)),
          );
        } else if (session.boundarySubIdx != null) {
          setSelectedSubsectionIdx(
            Math.max(0, Math.min(session.boundarySubIdx, maxIdx)),
          );
        }
      } else if (session.kind === "move" && session.clipId) {
        const selectIds = selectionIdsAfterFormaMove(
          session.clipId,
          session.moveIds ?? [session.clipId],
          Boolean(session.explicitMulti),
        );
        setClipSelection((prev) =>
          setSelection(
            [
              ...prev.items.filter((i) => i.lane !== "forma"),
              ...selectIds.map((id: string) => ({ id, lane: "forma" as const })),
            ],
            session.clipId,
          ),
        );
      } else if (session.clipId) {
        selectLaneClip("forma", session.clipId);
      }
    },
    [
      draftRef,
      commitDraft,
      setClipSelection,
      selectLaneClip,
      clearClipSelection,
      setSelectedSubsectionIdx,
    ],
  );

  useEffect(() => {
    if (!gestureSession) return;
    const pointerId = gestureSession.pointerId;

    function onMove(e: PointerEvent) {
      if (e.pointerId !== pointerId) return;
      if (!gestureSessionRef.current) return;
      const raw = rawTicksAtClientX(e.clientX);
      if (raw == null) return;
      updateFormaGesturePreview(
        raw,
        e.metaKey,
        e.ctrlKey,
        e.clientX,
        e.clientY,
      );
    }

    function onUp(e: PointerEvent) {
      if (e.pointerId !== pointerId) return;
      endFormaGesture(e.metaKey, e.ctrlKey);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [
    gestureSession,
    rawTicksAtClientX,
    updateFormaGesturePreview,
    endFormaGesture,
  ]);

  const beginContentPencilDraw = useCallback(
    (e: React.PointerEvent<HTMLElement>, lane: ContentLaneId) => {
      if (!gesturePolicy.pencilDraw) {
        setTouchAlertOpen(true);
        return;
      }
      if (!draftProject) return;
      const raw = rawTicksAtClientX(e.clientX);
      if (raw == null) return;
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      const session: FormaGestureSession = {
        kind: "pencil-draw",
        clipId: null,
        pointerId: e.pointerId,
        originTicks: raw,
        originClipStart: 0,
        originClipLength: 0,
        lane,
        originClientX: e.clientX,
      };
      const preview = previewContentFromSession(
        draftProject,
        session,
        raw,
        e.metaKey,
        e.ctrlKey,
        e.clientX,
      );
      beginFormaGesture(session, preview);
    },
    [
      gesturePolicy.pencilDraw,
      setTouchAlertOpen,
      draftProject,
      rawTicksAtClientX,
      beginFormaGesture,
    ],
  );

  const onContentClipPointerDown = useCallback(
    (
      e: React.PointerEvent<HTMLButtonElement>,
      lane: ContentLaneId,
      clip: { id: string; startTicks: number; lengthTicks: number },
    ) => {
      if (e.button !== 0 || !draftProject) return;
      e.preventDefault();
      e.stopPropagation();

      if (tool === "eraser") {
        if (lane === "tekst") {
          commitDraft(deleteTekstClip(draftProject, clip.id));
        } else if (lane === "akordy") {
          commitDraft(deleteAkordyClip(draftProject, clip.id));
        } else {
          commitDraft(deleteCueClip(draftProject, clip.id));
        }
        setClipSelection((prev) =>
          isClipSelected(prev, clip.id, lane)
            ? toggleSelected(prev, clip.id, lane)
            : prev,
        );
        return;
      }

      if (tool === "scissors") {
        const raw = rawTicksAtClientX(e.clientX);
        if (raw == null) return;
        const next = splitContentClipAt(draftProject, lane, clip.id, raw);
        if (next !== draftProject) commitDraft(next);
        return;
      }

      if (tool === "join") {
        const next = joinAdjacentContentClips(draftProject, lane, clip.id);
        if (next !== draftProject) commitDraft(next);
        return;
      }

      if (toolIsPencilDraw(tool)) {
        beginContentPencilDraw(e, lane);
        return;
      }

      if (!toolAllowsClipHitZones(tool)) return;

      if (isMultiSelectClick(e)) {
        clearMapSelection();
        setSelectedAnchorId(null);
        setSongMetaOpen(false);
        setClipSelection((prev) => toggleSelected(prev, clip.id, lane));
        setSelectedSubsectionIdx(null);
        return;
      }
      if (e.shiftKey) {
        clearMapSelection();
        setSelectedAnchorId(null);
        setSongMetaOpen(false);
        const laneClips =
          lane === "tekst"
            ? draftProject.tekst.clips
            : lane === "akordy"
              ? draftProject.akordy.clips
              : draftProject.cue.clips;
        setClipSelection((prev) => selectRangeTo(prev, clip.id, lane, laneClips));
        setSelectedSubsectionIdx(null);
        return;
      }

      if (!gesturePolicy.clipDragResize) {
        clearMapSelection();
        selectLaneClip(lane, clip.id);
        return;
      }

      const onLaneIds = idsOnLane(clipSelection, lane);
      const inMulti =
        isClipSelected(clipSelection, clip.id, lane) && onLaneIds.length > 1;
      if (!inMulti) {
        clearMapSelection();
        selectLaneClip(lane, clip.id);
      } else {
        setClipSelection((prev) => setSelection(prev.items, clip.id));
        setSelectedSubsectionIdx(null);
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const zone = hitTestClipZone(e.clientX - rect.left, rect.width, true);
      const raw = rawTicksAtClientX(e.clientX);
      if (raw == null) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

      const kind =
        zone === "start"
          ? "resize-start"
          : zone === "end"
            ? "resize-end"
            : "move";
      const moveIds =
        kind === "move"
          ? inMulti
            ? resolveMoveIds(clipSelection, clip.id, lane)
            : [clip.id]
          : [clip.id];
      const session: FormaGestureSession = {
        kind,
        clipId: clip.id,
        pointerId: e.pointerId,
        originTicks: raw,
        originClipStart: clip.startTicks,
        originClipLength: clip.lengthTicks,
        lane,
        originClientX: e.clientX,
        moveIds: kind === "move" ? moveIds : undefined,
        optionCopy: kind === "move" ? Boolean(e.altKey) : undefined,
      };
      const preview = previewContentFromSession(
        draftProject,
        session,
        raw,
        e.metaKey,
        e.ctrlKey,
        e.clientX,
      );
      beginFormaGesture(session, preview);
    },
    [
      draftProject,
      tool,
      commitDraft,
      setClipSelection,
      rawTicksAtClientX,
      beginContentPencilDraw,
      clearMapSelection,
      setSelectedAnchorId,
      setSongMetaOpen,
      setSelectedSubsectionIdx,
      gesturePolicy.clipDragResize,
      selectLaneClip,
      clipSelection,
      beginFormaGesture,
    ],
  );

  const onAudioClipPointerDown = useCallback(
    (
      e: React.PointerEvent<HTMLButtonElement>,
      lane: AudioLaneId,
      clip: { id: string; startTicks: number; lengthTicks: number },
    ) => {
      if (e.button !== 0 || !draftProject) return;
      e.preventDefault();
      e.stopPropagation();

      if (tool === "eraser") {
        commitDraft(deleteClipsOnLane(draftProject, lane, [clip.id]));
        setClipSelection((prev) =>
          isClipSelected(prev, clip.id, lane)
            ? toggleSelected(prev, clip.id, lane)
            : prev,
        );
        return;
      }
      if (tool === "scissors") {
        const raw = rawTicksAtClientX(e.clientX);
        if (raw == null) return;
        const next = splitAudioClipAt(draftProject, clip.id, raw);
        if (next !== draftProject) commitDraft(next);
        return;
      }
      if (tool === "join") {
        const next = joinAdjacentAudioClips(draftProject, clip.id);
        if (next !== draftProject) commitDraft(next);
        return;
      }
      if (tool === "mute") {
        commitDraft(toggleAudioClipMute(draftProject, clip.id));
        return;
      }
      if (tool === "solo") {
        const trackId = audioTrackIdFromLane(lane);
        soloHoldRef.current = soloAudioTrackIds;
        setSoloAudioTrackIds([trackId]);
        const release = () => {
          if (soloHoldRef.current) {
            setSoloAudioTrackIds(soloHoldRef.current);
            soloHoldRef.current = null;
          }
          window.removeEventListener("pointerup", release);
          window.removeEventListener("blur", release);
        };
        window.addEventListener("pointerup", release);
        window.addEventListener("blur", release);
        return;
      }
      if (tool === "fade") {
        if (!gesturePolicy.clipDragResize) {
          selectLaneClip(lane, clip.id);
          return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const zone = hitTestAudioClipZone(
          e.clientX - rect.left,
          e.clientY - rect.top,
          rect.width,
          rect.height,
          true,
          true,
        );
        const fadeKind =
          zone === "fade-out" || zone === "end" ? "fade-out" : "fade-in";
        const full = draftProject.audioClips.find((c) => c.id === clip.id);
        const raw = rawTicksAtClientX(e.clientX);
        if (raw == null || !full) return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        const session: FormaGestureSession = {
          kind: fadeKind,
          clipId: clip.id,
          pointerId: e.pointerId,
          originTicks: raw,
          originClipStart: clip.startTicks,
          originClipLength: clip.lengthTicks,
          lane,
          originClientX: e.clientX,
          originFadeMs:
            fadeKind === "fade-in" ? (full.fadeInMs ?? 0) : (full.fadeOutMs ?? 0),
        };
        beginFormaGesture(
          session,
          previewAudioFromSession(
            draftProject,
            session,
            raw,
            e.metaKey,
            e.ctrlKey,
          ),
        );
        return;
      }
      if (tool === "gain") {
        if (!gesturePolicy.clipDragResize) {
          selectLaneClip(lane, clip.id);
          return;
        }
        const full = draftProject.audioClips.find((c) => c.id === clip.id);
        const raw = rawTicksAtClientX(e.clientX);
        if (raw == null || !full) return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        const session: FormaGestureSession = {
          kind: "gain",
          clipId: clip.id,
          pointerId: e.pointerId,
          originTicks: raw,
          originClipStart: clip.startTicks,
          originClipLength: clip.lengthTicks,
          lane,
          originClientX: e.clientX,
          originClientY: e.clientY,
          originGainDb: full.gainDb ?? 0,
        };
        beginFormaGesture(
          session,
          previewAudioFromSession(
            draftProject,
            session,
            raw,
            e.metaKey,
            e.ctrlKey,
            e.clientY,
          ),
        );
        return;
      }
      if (toolIsPencilDraw(tool) || tool === "marquee" || tool === "zoom") {
        return;
      }
      if (!toolAllowsClipHitZones(tool)) return;
      if (isMultiSelectClick(e)) {
        clearMapSelection();
        setSelectedAnchorId(null);
        setSongMetaOpen(false);
        setClipSelection((prev) => toggleSelected(prev, clip.id, lane));
        return;
      }
      if (e.shiftKey) {
        clearMapSelection();
        setSelectedAnchorId(null);
        setSongMetaOpen(false);
        const trackId = audioTrackIdFromLane(lane);
        const laneClips = draftProject.audioClips.filter(
          (c) => c.trackId === trackId,
        );
        setClipSelection((prev) => selectRangeTo(prev, clip.id, lane, laneClips));
        return;
      }
      if (!gesturePolicy.clipDragResize) {
        clearMapSelection();
        selectLaneClip(lane, clip.id);
        return;
      }
      const onLaneIds = idsOnLane(clipSelection, lane);
      const inMulti =
        isClipSelected(clipSelection, clip.id, lane) && onLaneIds.length > 1;
      if (!inMulti) {
        clearMapSelection();
        selectLaneClip(lane, clip.id);
      } else {
        setClipSelection((prev) => setSelection(prev.items, clip.id));
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const zone = hitTestClipZone(e.clientX - rect.left, rect.width, true);
      const raw = rawTicksAtClientX(e.clientX);
      if (raw == null) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      const kind =
        zone === "start"
          ? "resize-start"
          : zone === "end"
            ? "resize-end"
            : "move";
      const moveIds =
        kind === "move"
          ? inMulti
            ? resolveMoveIds(clipSelection, clip.id, lane)
            : [clip.id]
          : [clip.id];
      const session: FormaGestureSession = {
        kind,
        clipId: clip.id,
        pointerId: e.pointerId,
        originTicks: raw,
        originClipStart: clip.startTicks,
        originClipLength: clip.lengthTicks,
        lane,
        originClientX: e.clientX,
        moveIds: kind === "move" ? moveIds : undefined,
      };
      beginFormaGesture(
        session,
        previewAudioFromSession(draftProject, session, raw, e.metaKey, e.ctrlKey),
      );
    },
    [
      draftProject,
      tool,
      commitDraft,
      setClipSelection,
      rawTicksAtClientX,
      soloAudioTrackIds,
      setSoloAudioTrackIds,
      soloHoldRef,
      gesturePolicy.clipDragResize,
      selectLaneClip,
      beginFormaGesture,
      clearMapSelection,
      setSelectedAnchorId,
      setSongMetaOpen,
      clipSelection,
    ],
  );

  const onFormaLanePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 || !draftProject) return;
      if (tool === "eraser") {
        e.preventDefault();
        deleteSelectedFormaClip();
        return;
      }
      if (tool === "scissors") {
        e.preventDefault();
        const raw = rawTicksAtClientX(e.clientX);
        if (raw == null) return;
        const hit =
          formaSectionCoveringTicks(draftProject, raw) ??
          (selectedClipId
            ? draftProject.forma.clips.find(
                (c) => c.id === selectedClipId && c.kind === "section",
              )
            : null);
        if (!hit) return;
        clearMapSelection();
        selectLaneClip("forma", hit.id);
        const next = splitFormaClipAt(draftProject, hit.id, raw);
        if (next !== draftProject) commitDraft(next);
        return;
      }
      if (!toolIsPencilDraw(tool)) {
        if (toolUsesMarqueeGesture(tool, e.pointerType)) {
          beginMarquee(e);
        } else if (
          isTouchPointerType(e.pointerType) &&
          tool === "pointer" &&
          !heldZoomRef.current
        ) {
          beginTouchCanvasNav(e);
        }
        return;
      }
      if (!gesturePolicy.pencilDraw) {
        setTouchAlertOpen(true);
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const raw = rawTicksAtClientX(e.clientX);
      if (raw == null) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      const n =
        draftProject.forma.clips.filter((c) => c.kind === "section").length + 1;
      const session: FormaGestureSession = {
        kind: "pencil-draw",
        clipId: null,
        pointerId: e.pointerId,
        originTicks: raw,
        originClipStart: 0,
        originClipLength: 0,
        originClientX: e.clientX,
      };
      const preview = previewFromSession(
        draftProject,
        session,
        raw,
        e.metaKey,
        e.ctrlKey,
        `Sekcja ${n}`,
        e.clientX,
      );
      beginFormaGesture(session, preview);
    },
    [
      draftProject,
      tool,
      deleteSelectedFormaClip,
      rawTicksAtClientX,
      selectedClipId,
      clearMapSelection,
      selectLaneClip,
      commitDraft,
      beginMarquee,
      heldZoomRef,
      beginTouchCanvasNav,
      gesturePolicy.pencilDraw,
      setTouchAlertOpen,
      beginFormaGesture,
    ],
  );

  const onFormaLanePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!gestureSessionRef.current) return;
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      const raw = rawTicksAtClientX(e.clientX);
      if (raw == null) return;
      updateFormaGesturePreview(raw, e.metaKey, e.ctrlKey, e.clientX);
    },
    [rawTicksAtClientX, updateFormaGesturePreview],
  );

  const onFormaLanePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!gestureSessionRef.current) return;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      endFormaGesture(e.metaKey, e.ctrlKey);
    },
    [endFormaGesture],
  );

  const onFormaClipPointerDown = useCallback(
    (
      e: React.PointerEvent<HTMLButtonElement>,
      clip: FormaClip,
    ) => {
      if (e.button !== 0 || !draftProject) return;
      e.preventDefault();
      e.stopPropagation();

      if (tool === "eraser") {
        if (clip.kind === "countdown") return;
        commitDraft(deleteFormaClip(draftProject, clip.id));
        setClipSelection((prev) =>
          isClipSelected(prev, clip.id, "forma")
            ? toggleSelected(prev, clip.id, "forma")
            : prev,
        );
        return;
      }

      if (tool === "scissors") {
        if (clip.kind === "countdown") return;
        const raw = rawTicksAtClientX(e.clientX);
        if (raw == null) return;
        clearMapSelection();
        selectLaneClip("forma", clip.id);
        const next = splitFormaClipAt(draftProject, clip.id, raw);
        if (next !== draftProject) commitDraft(next);
        return;
      }

      if (tool === "join") {
        if (clip.kind === "countdown") return;
        const raw = rawTicksAtClientX(e.clientX);
        if (raw == null) return;
        const next = joinFormaAtClick(draftProject, clip.id, raw);
        if (next !== draftProject) commitDraft(next);
        return;
      }

      if (toolIsPencilDraw(tool)) {
        const raw = rawTicksAtClientX(e.clientX);
        if (raw == null) return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        const n =
          draftProject.forma.clips.filter((c) => c.kind === "section").length + 1;
        const session: FormaGestureSession = {
          kind: "pencil-draw",
          clipId: null,
          pointerId: e.pointerId,
          originTicks: raw,
          originClipStart: 0,
          originClipLength: 0,
          originClientX: e.clientX,
        };
        const preview = previewFromSession(
          draftProject,
          session,
          raw,
          e.metaKey,
          e.ctrlKey,
          `Sekcja ${n}`,
          e.clientX,
        );
        beginFormaGesture(session, preview);
        return;
      }

      if (!toolAllowsClipHitZones(tool)) return;

      // Multi-select modifiers (v4)
      if (clip.kind !== "countdown" && isMultiSelectClick(e)) {
        clearMapSelection();
        setSelectedAnchorId(null);
        setSongMetaOpen(false);
        setClipSelection((prev) => toggleSelected(prev, clip.id, "forma"));
        setSelectedSubsectionIdx(null);
        return;
      }
      if (clip.kind !== "countdown" && e.shiftKey) {
        clearMapSelection();
        setSelectedAnchorId(null);
        setSongMetaOpen(false);
        const laneClips = draftProject.forma.clips
          .filter((c) => c.kind === "section" || c.kind === "countdown")
          .map((c) => ({ id: c.id, startTicks: c.startTicks }));
        setClipSelection((prev) =>
          selectRangeTo(prev, clip.id, "forma", laneClips),
        );
        setSelectedSubsectionIdx(null);
        return;
      }

      const onLaneIds = idsOnLane(clipSelection, "forma");
      const inMulti =
        clip.kind !== "countdown" &&
        isClipSelected(clipSelection, clip.id, "forma") &&
        onLaneIds.length > 1;

      if (!inMulti) {
        clearMapSelection();
        selectLaneClip("forma", clip.id);
      } else {
        setClipSelection((prev) => setSelection(prev.items, clip.id));
      }
      setSongMetaOpen(false);
      if (clip.kind === "countdown") {
        setSelectedSubsectionIdx(null);
        if (!gesturePolicy.clipDragResize) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const localX = e.clientX - rect.left;
        const zone = hitTestClipZone(localX, rect.width, true);
        if (zone === "start") {
          if (canvasNoticeTimerRef.current) {
            clearTimeout(canvasNoticeTimerRef.current);
          }
          setCanvasNotice(
            "Countdown: tylko prawa krawędź lub przeciągnięcie (długość)",
          );
          canvasNoticeTimerRef.current = setTimeout(() => {
            setCanvasNotice(null);
            canvasNoticeTimerRef.current = null;
          }, 2800);
          return;
        }
        const raw = rawTicksAtClientX(e.clientX);
        if (raw == null) return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        const session: FormaGestureSession = {
          kind: "countdown-length",
          clipId: clip.id,
          pointerId: e.pointerId,
          originTicks: raw,
          originClipStart: clip.startTicks,
          originClipLength: clip.lengthTicks,
          originClientX: e.clientX,
        };
        const preview = previewFromSession(
          draftProject,
          session,
          raw,
          e.metaKey,
          e.ctrlKey,
          undefined,
          e.clientX,
          effectiveZoomH,
        );
        beginFormaGesture(session, preview);
        return;
      }

      if (!gesturePolicy.clipDragResize) {
        setSelectedSubsectionIdx(null);
        return;
      }

      const boundaryEl = (e.target as HTMLElement | null)?.closest?.(
        "[data-sub-boundary]",
      ) as HTMLElement | null;
      if (boundaryEl) {
        const boundarySubIdx = Number(boundaryEl.dataset.subBoundary);
        if (Number.isFinite(boundarySubIdx) && boundarySubIdx >= 1) {
          const ranges = subsectionRanges(clip.subsections, clip.lengthTicks);
          if (boundarySubIdx >= ranges.length) return;
          setSelectedSubsectionIdx(boundarySubIdx);
          const raw = rawTicksAtClientX(e.clientX);
          if (raw == null) return;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          const originBoundaryRel = ranges[boundarySubIdx]!.startRel;
          const session: FormaGestureSession = {
            kind: "subsection-boundary",
            clipId: clip.id,
            pointerId: e.pointerId,
            originTicks: raw,
            originClipStart: clip.startTicks,
            originClipLength: clip.lengthTicks,
            boundarySubIdx,
            originBoundaryRel,
          };
          const preview = previewFromSession(
            draftProject,
            session,
            raw,
            e.metaKey,
            e.ctrlKey,
          );
          beginFormaGesture(session, preview);
          return;
        }
      }

      const subEl = (e.target as HTMLElement | null)?.closest?.(
        "[data-sub-idx]",
      ) as HTMLElement | null;
      const subsectionIdx =
        subEl && subEl.dataset.subIdx != null
          ? Number(subEl.dataset.subIdx)
          : null;
      setSelectedSubsectionIdx(
        subsectionIdx != null && Number.isFinite(subsectionIdx)
          ? subsectionIdx
          : null,
      );

      const rect = e.currentTarget.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const zone = hitTestClipZone(localX, rect.width, true);
      const raw = rawTicksAtClientX(e.clientX);
      if (raw == null) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

      const kind =
        zone === "start"
          ? "resize-start"
          : zone === "end"
            ? "resize-end"
            : "move";
      const moveIds =
        kind === "move"
          ? inMulti
            ? resolveMoveIds(clipSelection, clip.id, "forma")
            : cascadeFormaMoveIds(draftProject.forma.clips, clip.id)
          : [clip.id];
      const session: FormaGestureSession = {
        kind,
        clipId: clip.id,
        pointerId: e.pointerId,
        originTicks: raw,
        originClipStart: clip.startTicks,
        originClipLength: clip.lengthTicks,
        moveIds: kind === "move" ? moveIds : undefined,
        explicitMulti: kind === "move" ? inMulti : undefined,
        optionCopy: kind === "move" ? Boolean(e.altKey) : undefined,
      };
      const preview = previewFromSession(
        draftProject,
        session,
        raw,
        e.metaKey,
        e.ctrlKey,
      );
      beginFormaGesture(session, preview);
    },
    [
      draftProject,
      tool,
      commitDraft,
      setClipSelection,
      rawTicksAtClientX,
      clearMapSelection,
      selectLaneClip,
      beginFormaGesture,
      setSelectedAnchorId,
      setSongMetaOpen,
      setSelectedSubsectionIdx,
      clipSelection,
      gesturePolicy.clipDragResize,
      canvasNoticeTimerRef,
      setCanvasNotice,
      effectiveZoomH,
    ],
  );

  const onFormaClipPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!gestureSessionRef.current) return;
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      const raw = rawTicksAtClientX(e.clientX);
      if (raw == null) return;
      updateFormaGesturePreview(raw, e.metaKey, e.ctrlKey, e.clientX, e.clientY);
    },
    [rawTicksAtClientX, updateFormaGesturePreview],
  );

  const onFormaClipPointerUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!gestureSessionRef.current) return;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      endFormaGesture(e.metaKey, e.ctrlKey);
    },
    [endFormaGesture],
  );

  return {
    gestureSession,
    gesturePreview,
    gestureSessionRef,
    beginFormaGesture,
    updateFormaGesturePreview,
    endFormaGesture,
    beginContentPencilDraw,
    onContentClipPointerDown,
    onAudioClipPointerDown,
    onFormaLanePointerDown,
    onFormaLanePointerMove,
    onFormaLanePointerUp,
    onFormaClipPointerDown,
    onFormaClipPointerMove,
    onFormaClipPointerUp,
  };
}
