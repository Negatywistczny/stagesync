import { useState, useCallback, useLayoutEffect, useRef } from "react";
import { Button } from "@stagesync/ui";
import {
  cursorForHitZone,
  hitTestClipZone,
  type ClipHitZone,
} from "@lib/timeline/timelineGesture.js";
import { subsectionRanges } from "@lib/timeline-edit/formaSubsections.js";
import type { FormaClip } from "@stagesync/shared";
import type { ClipSelectionLane } from "@lib/timeline/timelineSelection.js";
import type { NudgeAction } from "@lib/timeline/timelineTouchNudge.js";
import styles from "../TimelineShell.module.css";

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
}: {
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
}) {
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
          {ranges.map((sub) => (
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
          {ranges.slice(1).map((sub) => (
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

export function TouchNudgeBar({
  clipId,
  lane,
  showLeftEdge,
  onAction,
}: {
  clipId: string;
  lane: string;
  showLeftEdge: boolean;
  onAction: (action: NudgeAction) => void;
}) {
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);

  const reposition = useCallback(() => {
    const leftEdge = leftRef.current;
    const rightEdge = rightRef.current;
    if (!rightEdge && !leftEdge) return;

    const clipEl =
      document.querySelector<HTMLElement>(
        `[data-clip-id="${CSS.escape(clipId)}"][data-clip-lane="${CSS.escape(lane)}"]`,
      ) ??
      document.querySelector<HTMLElement>(
        `[data-clip-id="${CSS.escape(clipId)}"]`,
      );
    const scrollEl = document.querySelector<HTMLElement>(
      "[data-canvas-scroll]",
    );
    const pad = 4;

    if (!clipEl) {
      if (leftEdge) leftEdge.style.visibility = "hidden";
      if (rightEdge) rightEdge.style.visibility = "hidden";
      return;
    }

    const clipRect = clipEl.getBoundingClientRect();
    const scrollRect = scrollEl?.getBoundingClientRect() ?? null;
    const top = scrollRect
      ? Math.max(
          scrollRect.top + pad,
          Math.min(clipRect.top, scrollRect.bottom - pad),
        )
      : Math.max(pad, clipRect.top);
    const viewLeft = scrollRect ? scrollRect.left : 0;
    const viewRight = scrollRect ? scrollRect.right : window.innerWidth;

    if (leftEdge) {
      if (!showLeftEdge) {
        leftEdge.style.visibility = "hidden";
      } else {
        leftEdge.style.visibility = "visible";
        const leftW = leftEdge.offsetWidth || 52;
        let leftX = clipRect.left;
        let leftTx = "translate(-100%, 0)";
        if (leftX - leftW < viewLeft + pad) {
          leftX = Math.min(clipRect.left + 2, viewRight - leftW - pad);
          leftTx = "translate(0, 0)";
        }
        leftEdge.style.top = `${top}px`;
        leftEdge.style.left = `${leftX}px`;
        leftEdge.style.transform = leftTx;
      }
    }

    if (rightEdge) {
      rightEdge.style.visibility = "visible";
      const rightW = rightEdge.offsetWidth || 52;
      let rightX = clipRect.right;
      let rightTx = "translate(0, 0)";
      if (rightX + rightW > viewRight - pad) {
        rightX = Math.max(clipRect.right - 2, viewLeft + rightW + pad);
        rightTx = "translate(-100%, 0)";
      }
      rightEdge.style.top = `${top}px`;
      rightEdge.style.left = `${rightX}px`;
      rightEdge.style.transform = rightTx;
    }
  }, [clipId, lane, showLeftEdge]);

  useLayoutEffect(() => {
    reposition();
    const scrollEl = document.querySelector("[data-canvas-scroll]");
    scrollEl?.addEventListener("scroll", reposition, { passive: true });
    window.addEventListener("resize", reposition, { passive: true });
    return () => {
      scrollEl?.removeEventListener("scroll", reposition);
      window.removeEventListener("resize", reposition);
    };
  }, [reposition]);

  return (
    <div
      className={styles.touchNudge}
      role="toolbar"
      aria-label="Przesuń i rozciągnij klip"
    >
      {showLeftEdge ? (
        <div
          ref={leftRef}
          className={styles.touchNudgeEdge}
          data-nudge-edge="left"
        >
          <Button
            variant="ghost"
            iconOnly
            className={styles.touchNudgeMove}
            aria-label="Przesuń w lewo"
            onClick={() => onAction("move-left")}
          >
            ◀
          </Button>
          <div className={styles.touchNudgeStretch} data-nudge-group="resize">
            <Button
              variant="ghost"
              iconOnly
              className={styles.touchNudgeStretchBtn}
              aria-label="Wydłuż lewą krawędź"
              onClick={() => onAction("stretch-left-out")}
            >
              ◂|
            </Button>
            <Button
              variant="ghost"
              iconOnly
              className={styles.touchNudgeStretchBtn}
              aria-label="Skróć od lewej"
              onClick={() => onAction("stretch-left-in")}
            >
              |▸
            </Button>
          </div>
        </div>
      ) : null}
      <div
        ref={rightRef}
        className={styles.touchNudgeEdge}
        data-nudge-edge="right"
      >
        <Button
          variant="ghost"
          iconOnly
          className={styles.touchNudgeMove}
          aria-label="Przesuń w prawo"
          onClick={() => onAction("move-right")}
        >
          ▶
        </Button>
        <div className={styles.touchNudgeStretch} data-nudge-group="resize">
          <Button
            variant="ghost"
            iconOnly
            className={styles.touchNudgeStretchBtn}
            aria-label="Skróć od prawej"
            onClick={() => onAction("stretch-right-in")}
          >
            ◂|
          </Button>
          <Button
            variant="ghost"
            iconOnly
            className={styles.touchNudgeStretchBtn}
            aria-label="Wydłuż prawą krawędź"
            onClick={() => onAction("stretch-right-out")}
          >
            |▸
          </Button>
        </div>
      </div>
    </div>
  );
}
