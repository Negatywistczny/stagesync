import React from "react";
import type { Project } from "@stagesync/shared";
import type { MapLaneId } from "@lib/timeline/mapLaneEdit.js";
import { segmentStylePx, type MapSegment } from "@lib/timeline/mapSegments.js";
import {
  anchorBarWidthTicks,
  canEditKotwice,
  scoreAnchors,
  ticksFromLogicBar,
  deleteScoreAnchor,
  moveScoreAnchor,
} from "@lib/timeline-edit/scoreBarEdit.js";
import { mapSegmentSelectionAriaLabel } from "@lib/timeline/timelineContextMenus.js";
import { toolAllowsClipHitZones } from "@lib/timeline/timelineGesture.js";
import { tickToPx } from "@lib/timeline-edit/formaCanvas.js";
import type { ToolId } from "../../timelineToolsData.js";
import styles from "../../TimelineShell.module.css";

export type TimelineMapLaneRendererProps = {
  trackId: "tempo" | "metrum" | "tonacja" | "kotwice";
  draftProject: Project;
  selectedMapLane: MapLaneId | null;
  selectedMapIds: string[];
  mapDragPreview: {
    lane: MapLaneId;
    moveIds: string[];
    deltaTicks: number;
  } | null;
  tempoSegments: MapSegment[];
  meterSegments: MapSegment[];
  keySegments: MapSegment[];
  selectedAnchorId: string | null;
  viewSpan: { start: number; end: number };
  barTicks: number;
  effectiveZoomH: number;
  tool: ToolId;
  commitDraft: (p: Project) => void;
  clearClipSelection: () => void;
  clearMapSelection: () => void;
  setSelectedAnchorId: (id: string | null) => void;
  setInspectorVisible: (v: boolean) => void;
  setSongMetaOpen: (v: boolean) => void;
  setMapSelection: (
    lane: MapLaneId,
    ids: string[],
    primaryId: string | null,
  ) => void;
  openMapEdit: (lane: MapLaneId, ticks: number) => void;
  rawTicksAtClientX: (clientX: number) => number | null;
  onMapSegmentPointerDown: (
    e: React.PointerEvent<HTMLButtonElement>,
    lane: MapLaneId,
    seg: MapSegment,
  ) => void;
  onMapSegmentPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onMapSegmentPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => void;
};

export function TimelineMapLaneRenderer({
  trackId,
  draftProject,
  selectedMapLane,
  selectedMapIds,
  mapDragPreview,
  tempoSegments,
  meterSegments,
  keySegments,
  selectedAnchorId,
  viewSpan,
  barTicks,
  effectiveZoomH,
  tool,
  commitDraft,
  clearClipSelection,
  clearMapSelection,
  setSelectedAnchorId,
  setInspectorVisible,
  setSongMetaOpen,
  setMapSelection,
  openMapEdit,
  rawTicksAtClientX,
  onMapSegmentPointerDown,
  onMapSegmentPointerMove,
  onMapSegmentPointerUp,
}: TimelineMapLaneRendererProps): React.ReactNode {
  const mapSelectedClass = (eventId: string, lane: MapLaneId) =>
    selectedMapLane === lane && selectedMapIds.includes(eventId)
      ? styles.mapSegmentSelected
      : "";
  const mapDraggingClass = (eventId: string) =>
    mapDragPreview?.moveIds.includes(eventId) ? styles.mapSegmentDragging : "";
  const mapSegmentSelected = (eventId: string, lane: MapLaneId) =>
    selectedMapLane === lane && selectedMapIds.includes(eventId);
  const mapSegmentAriaLabel = (
    seg: { label: string; eventId: string },
    lane: MapLaneId,
  ) =>
    mapSegmentSelectionAriaLabel(seg.label, {
      selected: mapSegmentSelected(seg.eventId, lane),
      groupSize:
        mapSegmentSelected(seg.eventId, lane) &&
        selectedMapLane === lane &&
        selectedMapIds.length > 1
          ? selectedMapIds.length
          : undefined,
    });

  switch (trackId) {
    case "tempo":
      return tempoSegments.map((seg, i) => (
        <button
          key={`tempo-${seg.eventId}-${i}`}
          type="button"
          className={[
            styles.mapSegment,
            mapSelectedClass(seg.eventId, "tempo"),
            mapDraggingClass(seg.eventId),
          ]
            .filter(Boolean)
            .join(" ")}
          style={segmentStylePx(seg, viewSpan, barTicks, effectiveZoomH)}
          title={`${seg.label} — ⌘/⇧ multi · przeciągnij lub kliknij`}
          aria-label={mapSegmentAriaLabel(seg, "tempo")}
          onPointerDown={(e) => onMapSegmentPointerDown(e, "tempo", seg)}
          onPointerMove={onMapSegmentPointerMove}
          onPointerUp={onMapSegmentPointerUp}
          onPointerCancel={onMapSegmentPointerUp}
          onDoubleClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSongMetaOpen(false);
            if (!seg.eventId.endsWith("-default")) {
              setMapSelection("tempo", [seg.eventId], seg.eventId);
            }
            openMapEdit("tempo", seg.eventStartTicks);
          }}
        >
          {seg.label}
        </button>
      ));
    case "metrum":
      return meterSegments.map((seg, i) => (
        <button
          key={`meter-${seg.eventId}-${i}`}
          type="button"
          className={[
            styles.mapSegment,
            mapSelectedClass(seg.eventId, "metrum"),
            mapDraggingClass(seg.eventId),
          ]
            .filter(Boolean)
            .join(" ")}
          style={segmentStylePx(seg, viewSpan, barTicks, effectiveZoomH)}
          title={`${seg.label} — ⌘/⇧ multi · przeciągnij lub kliknij`}
          aria-label={mapSegmentAriaLabel(seg, "metrum")}
          onPointerDown={(e) => onMapSegmentPointerDown(e, "metrum", seg)}
          onPointerMove={onMapSegmentPointerMove}
          onPointerUp={onMapSegmentPointerUp}
          onPointerCancel={onMapSegmentPointerUp}
          onDoubleClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSongMetaOpen(false);
            if (!seg.eventId.endsWith("-default")) {
              setMapSelection("metrum", [seg.eventId], seg.eventId);
            }
            openMapEdit("metrum", seg.eventStartTicks);
          }}
        >
          {seg.label}
        </button>
      ));
    case "tonacja":
      return (keySegments.length > 0 ? keySegments : []).map((seg, i) => (
        <button
          key={`key-${seg.eventId}-${i}`}
          type="button"
          className={[
            styles.mapSegment,
            mapSelectedClass(seg.eventId, "tonacja"),
            mapDraggingClass(seg.eventId),
          ]
            .filter(Boolean)
            .join(" ")}
          style={segmentStylePx(seg, viewSpan, barTicks, effectiveZoomH)}
          title={`${seg.label} — ⌘/⇧ multi · przeciągnij lub kliknij`}
          aria-label={mapSegmentAriaLabel(seg, "tonacja")}
          onPointerDown={(e) => onMapSegmentPointerDown(e, "tonacja", seg)}
          onPointerMove={onMapSegmentPointerMove}
          onPointerUp={onMapSegmentPointerUp}
          onPointerCancel={onMapSegmentPointerUp}
          onDoubleClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSongMetaOpen(false);
            if (!seg.eventId.endsWith("-default")) {
              setMapSelection("tonacja", [seg.eventId], seg.eventId);
            }
            openMapEdit("tonacja", seg.eventStartTicks);
          }}
        >
          {seg.label}
        </button>
      ));
    case "kotwice": {
      const anchors = scoreAnchors(draftProject);
      if (anchors.length === 0 && !canEditKotwice(draftProject)) {
        return (
          <span className={styles.muted}>
            Kotwice — dodaj MusicXML (Admin) lub kotwicę Ołówkiem
          </span>
        );
      }
      return anchors.map((anchor) => {
        const start = ticksFromLogicBar(draftProject, anchor.logicBar);
        const width = anchorBarWidthTicks(draftProject, anchor.logicBar);
        return (
          <button
            key={anchor.id}
            type="button"
            className={[
              styles.clip,
              styles.kotwiceClip,
              selectedAnchorId === anchor.id ? styles.clipSelected : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              left: `${tickToPx(start, viewSpan, barTicks, effectiveZoomH)}px`,
              width: `${
                tickToPx(start + width, viewSpan, barTicks, effectiveZoomH) -
                tickToPx(start, viewSpan, barTicks, effectiveZoomH)
              }px`,
            }}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.preventDefault();
              e.stopPropagation();
              clearClipSelection();
              clearMapSelection();
              setSelectedAnchorId(anchor.id);
              setInspectorVisible(true);
              if (tool === "eraser") {
                commitDraft(deleteScoreAnchor(draftProject, anchor.id));
                setSelectedAnchorId(null);
                return;
              }
              if (!toolAllowsClipHitZones(tool) && tool !== "pointer") {
                return;
              }
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            }}
            onPointerUp={(e) => {
              if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
              e.currentTarget.releasePointerCapture(e.pointerId);
              const raw = rawTicksAtClientX(e.clientX);
              if (raw == null) return;
              commitDraft(moveScoreAnchor(draftProject, anchor.id, raw));
            }}
          >
            {anchor.logicBar} → {anchor.scoreBar}
          </button>
        );
      });
    }
  }
}
