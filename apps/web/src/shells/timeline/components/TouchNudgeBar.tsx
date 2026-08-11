import React, { useCallback, useLayoutEffect, useRef } from "react";
import { Button } from "@stagesync/ui";
import type { NudgeAction } from "@lib/timeline/timelineTouchNudge.js";
import styles from "../TimelineShell.module.css";

export type TouchNudgeBarProps = {
  clipId: string;
  lane: string;
  showLeftEdge: boolean;
  onAction: (action: NudgeAction) => void;
};

export function TouchNudgeBar({
  clipId,
  lane,
  showLeftEdge,
  onAction,
}: TouchNudgeBarProps) {
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
