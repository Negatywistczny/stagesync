import React from "react";
import type { Project } from "@stagesync/shared";
import { Button } from "@stagesync/ui";
import {
  IconWand,
  IconTap,
} from "../../components/icons.js";
import {
  isAudioTrackSelected,
  type TrackSelection,
} from "@lib/timeline/timelineSelection.js";
import {
  DOCK_COMPACT_MAX_PX,
  laneHeightBase,
  laneHeightEffective,
} from "@lib/timeline/timelineLaneHeights.js";
import type { ToolId } from "../timelineToolsData.js";
import { ChannelStripControls } from "../channelStrip/ChannelStripControls.js";
import styles from "../TimelineShell.module.css";

export type TimelineTrackRowDockProps = {
  track: {
    id: string;
    label: string;
    group: string;
    audioTrackId?: string;
  };
  draftProject: Project | null;
  trackSelection: TrackSelection;
  soloAudioTrackIds: string[];
  trackRename: { trackId: string; name: string } | null;
  buildChannelStripCallbacks: (trackId: string) => any;
  laneHeights: Record<string, number>;
  zoomV: number;
  uiScale: number;
  tool: ToolId;
  onTool: (tool: ToolId) => void;
  isMobilePreview: boolean;
  touchTier: string;
  laneResizeTrackId: string | null;
  beginLaneResize: (e: React.PointerEvent, trackId: string) => void;
  onLaneResizePointerMove: (e: React.PointerEvent) => void;
  endLaneResize: (e: React.PointerEvent) => void;
  onLaneResizeDblClick: (e: React.MouseEvent, trackId: string) => void;
  onAudioTrackHeaderClick: (e: React.MouseEvent, trackId: string) => void;
  openAudioTrackContextMenu: (
    trackId: string,
    clientX: number,
    clientY: number,
  ) => void;
};

export function TimelineTrackRowDock({
  track,
  draftProject,
  trackSelection,
  soloAudioTrackIds,
  trackRename,
  buildChannelStripCallbacks,
  laneHeights,
  zoomV,
  uiScale,
  tool,
  onTool,
  isMobilePreview,
  touchTier,
  laneResizeTrackId,
  beginLaneResize,
  onLaneResizePointerMove,
  endLaneResize,
  onLaneResizeDblClick,
  onAudioTrackHeaderClick,
  openAudioTrackContextMenu,
}: TimelineTrackRowDockProps) {
  return (
    <div
      className={[
        styles.dockCell,
        track.group === "audio" ? styles.dockCellAudio : "",
        track.group === "special" ? styles.dockMuted : "",
        track.group === "audio" &&
        track.audioTrackId &&
        isAudioTrackSelected(trackSelection, track.audioTrackId)
          ? styles.dockSelected
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={(e) => {
        if (track.group !== "audio" || !track.audioTrackId) return;
        onAudioTrackHeaderClick(e, track.audioTrackId);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (track.group !== "audio" || !track.audioTrackId) return;
        openAudioTrackContextMenu(track.audioTrackId, e.clientX, e.clientY);
      }}
    >
      {track.group === "audio" && track.audioTrackId ? (
        <ChannelStripControls
          layout="dock"
          compact={
            laneHeightEffective(
              laneHeightBase(track.id, laneHeights, zoomV),
              uiScale,
            ) <= DOCK_COMPACT_MAX_PX
          }
          strip={{
            trackId: track.audioTrackId,
            name: track.label,
            muted: Boolean(
              draftProject?.audioTracks.find((a) => a.id === track.audioTrackId)
                ?.muted,
            ),
            gainDb:
              draftProject?.audioTracks.find((a) => a.id === track.audioTrackId)
                ?.gainDb ?? 0,
            pan:
              draftProject?.audioTracks.find((a) => a.id === track.audioTrackId)
                ?.pan ?? 0,
            color: draftProject?.audioTracks.find(
              (a) => a.id === track.audioTrackId,
            )?.color,
            icon: draftProject?.audioTracks.find(
              (a) => a.id === track.audioTrackId,
            )?.icon,
            soloed: soloAudioTrackIds.includes(track.audioTrackId),
            selected: isAudioTrackSelected(trackSelection, track.audioTrackId),
          }}
          callbacks={buildChannelStripCallbacks(track.audioTrackId)}
          renaming={trackRename?.trackId === track.audioTrackId}
          renameValue={
            trackRename?.trackId === track.audioTrackId
              ? trackRename.name
              : track.label
          }
          soloActiveClassName={styles.tapBtnSolo}
          muteActiveClassName={styles.tapBtnMute}
          labelClassName={styles.dockLabel}
          faderClassName={styles.dockFader}
          renameInputClassName={styles.dockRenameInput}
        />
      ) : (
        <span className={styles.dockLabel}>{track.label}</span>
      )}
      {track.id === "forma" && !isMobilePreview ? (
        <Button
          variant="ghost"
          iconOnly
          selected={tool === "wand"}
          className={tool === "wand" ? styles.tapBtnSelected : undefined}
          title="Różdżka — rozmieszcza Tekst/Akordy wg Formy (W)"
          aria-label="Różdżka — rozmieszcza Tekst/Akordy wg Formy"
          onClick={() => onTool("wand")}
        >
          <IconWand />
        </Button>
      ) : null}
      {track.id === "tekst" && !isMobilePreview ? (
        <Button
          variant="ghost"
          iconOnly
          selected={tool === "tap"}
          className={tool === "tap" ? styles.tapBtnSelected : undefined}
          title="Tap — kolejka linii Tekstu; Spacja = start przy playheadzie"
          aria-label="Tap — kolejka linii Tekstu"
          onClick={() => onTool("tap")}
        >
          <IconTap />
        </Button>
      ) : null}
      {touchTier !== "mobile" ? (
        <button
          type="button"
          className={[
            styles.laneResize,
            laneResizeTrackId === track.id ? styles.laneResizeActive : "",
          ]
            .filter(Boolean)
            .join(" ")}
          title="Przeciągnij — wysokość ścieżki (dwuklik = domyślna)"
          aria-label={`Zmień wysokość ścieżki ${track.label}`}
          onPointerDown={(e) => beginLaneResize(e, track.id)}
          onPointerMove={onLaneResizePointerMove}
          onPointerUp={endLaneResize}
          onPointerCancel={endLaneResize}
          onDoubleClick={(e) => onLaneResizeDblClick(e, track.id)}
        />
      ) : null}
    </div>
  );
}
