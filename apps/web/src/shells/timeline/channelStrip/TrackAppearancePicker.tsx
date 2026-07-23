/**
 * Track icon + color picker popover (Mixer badge / dock).
 * Portaled + fixed so sticky dock overflow and mixer strip scroll do not clip it.
 */

import {
  useEffect,
  useLayoutEffect,
  useState,
  type MouseEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  TRACK_COLORS,
  TRACK_ICONS,
  TRACK_ICON_LABELS,
  type TrackColor,
  type TrackIcon,
} from "@stagesync/shared";
import { IconTrack } from "../../icons.js";
import styles from "./ChannelStripControls.module.css";

export type TrackAppearancePickerProps = {
  /** Badge / trigger — used to place the fixed popover. */
  anchorRef: RefObject<HTMLElement | null>;
  /** Prefer opening above the anchor (Mixer banner); dock opens below. */
  placement?: "above" | "below";
  color: TrackColor;
  icon: TrackIcon;
  onColorChange: (color: TrackColor) => void;
  onIconChange: (icon: TrackIcon) => void;
  onClose: () => void;
};

type PopoverPos = {
  top: number;
  left: number;
};

const POPOVER_GAP_PX = 4;
const VIEWPORT_PAD_PX = 8;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function TrackAppearancePicker({
  anchorRef,
  placement = "above",
  color,
  icon,
  onColorChange,
  onIconChange,
  onClose,
}: TrackAppearancePickerProps) {
  const [pos, setPos] = useState<PopoverPos | null>(null);
  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const pop = rootEl;
    if (!anchor || !pop) return;

    function place() {
      const a = anchorRef.current;
      const p = rootEl;
      if (!a || !p) return;
      const rect = a.getBoundingClientRect();
      const pw = p.offsetWidth;
      const ph = p.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let top =
        placement === "below"
          ? rect.bottom + POPOVER_GAP_PX
          : rect.top - ph - POPOVER_GAP_PX;

      // Flip if the preferred side does not fit.
      if (placement === "above" && top < VIEWPORT_PAD_PX) {
        top = rect.bottom + POPOVER_GAP_PX;
      } else if (
        placement === "below" &&
        top + ph > vh - VIEWPORT_PAD_PX
      ) {
        top = rect.top - ph - POPOVER_GAP_PX;
      }

      top = clamp(top, VIEWPORT_PAD_PX, Math.max(VIEWPORT_PAD_PX, vh - ph - VIEWPORT_PAD_PX));
      const left = clamp(
        rect.left + rect.width / 2 - pw / 2,
        VIEWPORT_PAD_PX,
        Math.max(VIEWPORT_PAD_PX, vw - pw - VIEWPORT_PAD_PX),
      );
      setPos({ top, left });
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchorRef, placement, rootEl]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    function onPointer(e: PointerEvent) {
      const el = rootEl;
      const anchor = anchorRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      if (anchor && e.target instanceof Node && anchor.contains(e.target)) {
        return;
      }
      onClose();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer, true);
    };
  }, [anchorRef, onClose, rootEl]);

  return createPortal(
    <div
      ref={setRootEl}
      className={styles.appearancePopover}
      role="dialog"
      aria-label="Kolor i ikona ścieżki"
      style={pos ? { top: pos.top, left: pos.left } : { visibility: "hidden" }}
      onClick={(e: MouseEvent) => e.stopPropagation()}
    >
      <div className={styles.appearanceSection}>
        <span className={styles.appearanceLabel}>Kolor</span>
        <div className={styles.colorGrid}>
          {TRACK_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={[
                styles.colorSwatch,
                c === color ? styles.colorSwatchSelected : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ background: c }}
              title={c}
              aria-label={`Kolor ${c}`}
              aria-pressed={c === color}
              onClick={() => {
                onColorChange(c);
              }}
            />
          ))}
        </div>
      </div>
      <div className={styles.appearanceSection}>
        <span className={styles.appearanceLabel}>Ikona</span>
        <div className={styles.iconGrid}>
          {TRACK_ICONS.map((id) => (
            <button
              key={id}
              type="button"
              className={[
                styles.iconPick,
                id === icon ? styles.iconPickSelected : "",
              ]
                .filter(Boolean)
                .join(" ")}
              title={TRACK_ICON_LABELS[id]}
              aria-label={TRACK_ICON_LABELS[id]}
              aria-pressed={id === icon}
              onClick={() => {
                onIconChange(id);
              }}
            >
              <IconTrack icon={id} />
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
