import { useCallback, useEffect, useRef } from "react";
import type { MapLaneId } from "@lib/timeline/mapLaneEdit.js";
import {
  clearTrackSelection,
  selectSingle,
  type ClipSelection,
  type ClipSelectionLane,
  type TrackSelection,
} from "@lib/timeline/timelineSelection.js";
import type { TimelineTouchTier } from "@lib/timeline/timelineTouchTier.js";

interface Params {
  touchTier: TimelineTouchTier;
  setInspectorVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setSongMetaOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setClipSelection: React.Dispatch<React.SetStateAction<ClipSelection>>;
  clearClipSelection: () => void;
  clearMapSelection: () => void;
  setTrackSelection: React.Dispatch<React.SetStateAction<TrackSelection>>;
  setSelectedAnchorId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedSubsectionIdx: React.Dispatch<React.SetStateAction<number | null>>;
  setSelectedMapLane: React.Dispatch<React.SetStateAction<MapLaneId | null>>;
  setSelectedMapIds: React.Dispatch<React.SetStateAction<string[]>>;
  setPrimaryMapId: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useTimelinePanelState({
  touchTier,
  setInspectorVisible,
  setSongMetaOpen,
  setClipSelection,
  clearClipSelection,
  clearMapSelection,
  setTrackSelection,
  setSelectedAnchorId,
  setSelectedSubsectionIdx,
  setSelectedMapLane,
  setSelectedMapIds,
  setPrimaryMapId,
}: Params) {
  const trackRowsRoRef = useRef<ResizeObserver | null>(null);

  const selectLaneClip = useCallback(
    (lane: ClipSelectionLane, id: string) => {
      setClipSelection(selectSingle(id, lane));
      if (lane !== "forma") setSelectedSubsectionIdx(null);
      setSelectedAnchorId(null);
      setSongMetaOpen(false);
      setInspectorVisible(true);
    },
    [
      setClipSelection,
      setSelectedSubsectionIdx,
      setSelectedAnchorId,
      setSongMetaOpen,
      setInspectorVisible,
    ],
  );

  /** Desktop dblclick → focus Właściwości (v4); tablet canvas double-tap stays Fit Zoom. */
  const focusInspectorPanel = useCallback(() => {
    if (touchTier === "mobile") return;
    setInspectorVisible(true);
    setSongMetaOpen(false);
    requestAnimationFrame(() => {
      const panel = document.querySelector<HTMLElement>(
        'aside[aria-label="Właściwości"]',
      );
      if (!panel) return;
      panel.scrollIntoView({ block: "nearest" });
      const field = panel.querySelector<HTMLElement>(
        "input:not([disabled]), textarea:not([disabled]), select:not([disabled])",
      );
      field?.focus({ preventScroll: true });
    });
  }, [touchTier, setInspectorVisible, setSongMetaOpen]);

  /** Esc — clear focus; on mobile preview there is no inspector sheet. */
  const closeMobileInspector = useCallback(() => {
    setSongMetaOpen(false);
    clearClipSelection();
    clearMapSelection();
    setTrackSelection(clearTrackSelection());
    setSelectedAnchorId(null);
    if (touchTier === "mobile") {
      setInspectorVisible(false);
    }
  }, [
    setSongMetaOpen,
    clearClipSelection,
    clearMapSelection,
    setTrackSelection,
    setSelectedAnchorId,
    touchTier,
    setInspectorVisible,
  ]);

  /** Header × — hide Właściwości (same as bare I off); mobile also clears sheet focus. */
  const closeInspectorPanel = useCallback(() => {
    setInspectorVisible(false);
    if (touchTier === "mobile") {
      setSongMetaOpen(false);
      clearClipSelection();
      clearMapSelection();
      setTrackSelection(clearTrackSelection());
      setSelectedAnchorId(null);
    }
  }, [
    setInspectorVisible,
    touchTier,
    setSongMetaOpen,
    clearClipSelection,
    clearMapSelection,
    setTrackSelection,
    setSelectedAnchorId,
  ]);

  const toggleInspectorPanel = useCallback(() => {
    if (touchTier === "mobile") return;
    setInspectorVisible((v) => !v);
  }, [touchTier, setInspectorVisible]);

  const setMapSelection = useCallback(
    (lane: MapLaneId, ids: string[], mapPrimaryId: string | null) => {
      setSelectedMapLane(lane);
      setSelectedMapIds(ids);
      setPrimaryMapId(mapPrimaryId);
      clearClipSelection();
      setSelectedAnchorId(null);
      setSongMetaOpen(false);
      setInspectorVisible(true);
    },
    [
      setSelectedMapLane,
      setSelectedMapIds,
      setPrimaryMapId,
      clearClipSelection,
      setSelectedAnchorId,
      setSongMetaOpen,
      setInspectorVisible,
    ],
  );

  const bindTrackRowsRef = useCallback((node: HTMLDivElement | null) => {
    trackRowsRoRef.current?.disconnect();
    trackRowsRoRef.current = null;
    if (!node) return;
    const sync = () => {
      node.style.setProperty("--tl-track-rows-h", `${node.clientHeight}px`);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(node);
    trackRowsRoRef.current = ro;
  }, []);

  useEffect(() => {
    return () => {
      trackRowsRoRef.current?.disconnect();
      trackRowsRoRef.current = null;
    };
  }, []);

  return {
    selectLaneClip,
    focusInspectorPanel,
    closeMobileInspector,
    closeInspectorPanel,
    toggleInspectorPanel,
    setMapSelection,
    bindTrackRowsRef,
  };
}
