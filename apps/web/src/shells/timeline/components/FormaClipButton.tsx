import React, { useState } from "react";
import type { FormaClip } from "@stagesync/shared";
import {
  cursorForHitZone,
  hitTestClipZone,
  type ClipHitZone,
} from "@lib/timeline/timelineGesture.js";
import { subsectionRanges } from "@lib/timeline-edit/formaSubsections.js";
import type { ClipSelectionLane } from "@lib/timeline/timelineSelection.js";
import styles from "../TimelineShell.module.css";

export type FormaClipButtonProps = {
  clip: FormaClip;
  selected: boolean;
  selectedSubsectionIdx: number | null;
  style: { left: string; width: string };
  pencilActive: boolean;
  allowHitZones: boolean;
  dimmed?: boolean;
  dataClipLane?: ClipSelectionLane;
  onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onDoubleClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onContextMenu?: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

export function FormaClipButton({
  clip,
  selected,
  selectedSubsectionIdx,
  style,
  pencilActive,
  allowHitZones,
  dimmed,
  dataClipLane,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onDoubleClick,
  onContextMenu,
}: FormaClipButtonProps) {
  const [hoverZone, setHoverZone] = useState<ClipHitZone>("body");
  const countdown = clip.kind === "countdown";
  const cursor = pencilActive
    ? "crosshair"
    : allowHitZones
      ? countdown
        ? hoverZone === "start"
          ? "not-allowed"
          : "ew-resize"
        : cursorForHitZone(hoverZone, true)
      : "pointer";

  const ranges =
    clip.kind === "section" && clip.subsections && clip.subsections.length > 0
      ? subsectionRanges(clip.subsections, clip.lengthTicks)
      : [];

  return (
    <button
      type="button"
      data-clip-id={clip.id}
      data-clip-lane={dataClipLane}
      className={[
        styles.clip,
        styles.formaClip,
        selected ? styles.clipOn : "",
        countdown ? styles.clipLocked : "",
        pencilActive ? styles.formaClipPencil : "",
        dimmed ? styles.formaClipDim : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ ...style, cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={(e) => {
        if (allowHitZones) {
          const rect = e.currentTarget.getBoundingClientRect();
          setHoverZone(
            hitTestClipZone(e.clientX - rect.left, rect.width, true),
          );
        }
        onPointerMove(e);
      }}
      onPointerUp={onPointerUp}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onPointerLeave={() => setHoverZone("body")}
    >
      {ranges.length > 1 ? (
        <span className={styles.formaSubs}>
          {ranges.map((sub: { index: number; startRel: number; lengthRel: number }) => (
            <span
              key={`band-${sub.index}`}
              className={[
                styles.formaSubBand,
                sub.index % 2 === 1 ? styles.formaSubBandAlt : "",
                selected && selectedSubsectionIdx === sub.index
                  ? styles.formaSubBandSelected
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              data-sub-idx={sub.index}
              style={{
                left: `${(sub.startRel / clip.lengthTicks) * 100}%`,
                width: `${(sub.lengthRel / clip.lengthTicks) * 100}%`,
              }}
              title={`Podsekcja ${sub.index + 1}`}
            />
          ))}
          {ranges.slice(1).map((sub: { index: number; startRel: number }) => (
            <span
              key={`bound-${sub.index}`}
              className={styles.formaSubBoundary}
              data-sub-boundary={sub.index}
              style={{ left: `${(sub.startRel / clip.lengthTicks) * 100}%` }}
              title={`Przeciągnij granicę podsekcji ${sub.index}`}
              aria-label={`Granica podsekcji ${sub.index + 1}`}
            />
          ))}
        </span>
      ) : null}
      <span className={styles.formaClipLabel}>
        {clip.kind === "countdown" ? `${clip.name} (CD)` : clip.name}
      </span>
    </button>
  );
}
