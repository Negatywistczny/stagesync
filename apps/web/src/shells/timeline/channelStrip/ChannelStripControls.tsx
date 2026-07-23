/**
 * Shared Solo / Mute / Fader controls for dock + Mixer (no pan — not in project model).
 */

import type { KeyboardEvent, MouseEvent } from "react";
import { Slider } from "@stagesync/ui";
import type { ChannelStripCallbacks, ChannelStripState } from "./channelStripTypes.js";
import { MiddleTruncateLabel } from "./MiddleTruncateLabel.js";
import styles from "./ChannelStripControls.module.css";

export type ChannelStripControlsProps = {
  strip: ChannelStripState;
  callbacks: ChannelStripCallbacks;
  /** `dock` = compact horizontal; `mixer` = vertical strip. */
  layout: "dock" | "mixer";
  /**
   * Dock height compression: single-row [Name][S][M], hide fader.
   * Driven by lane height (minimized / low Zoom V) — not block-size CQ
   * (Forma rows must still grow with content).
   */
  compact?: boolean;
  /** When set, name row shows inline rename input. */
  renaming?: boolean;
  renameValue?: string;
  className?: string;
  faderClassName?: string;
  soloClassName?: string;
  muteClassName?: string;
  soloActiveClassName?: string;
  muteActiveClassName?: string;
  labelClassName?: string;
  renameInputClassName?: string;
};

export function ChannelStripControls({
  strip,
  callbacks,
  layout,
  compact = false,
  renaming = false,
  renameValue = "",
  className,
  faderClassName,
  soloClassName,
  muteClassName,
  soloActiveClassName,
  muteActiveClassName,
  labelClassName,
  renameInputClassName,
}: ChannelStripControlsProps) {
  function onRenameKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      callbacks.onRenameCommit?.();
    } else if (e.key === "Escape") {
      e.preventDefault();
      callbacks.onRenameCancel?.();
    }
  }

  const nameRow = renaming ? (
    <input
      className={renameInputClassName ?? styles.renameInput}
      value={renameValue}
      autoFocus
      maxLength={80}
      aria-label={`Nazwa ścieżki ${strip.name}`}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => callbacks.onRenameChange?.(e.target.value)}
      onBlur={() => callbacks.onRenameCommit?.()}
      onKeyDown={onRenameKeyDown}
    />
  ) : (
    <MiddleTruncateLabel
      text={strip.name}
      className={labelClassName ?? styles.label}
      onDoubleClick={(e: MouseEvent) => {
        e.stopPropagation();
        callbacks.onNameDoubleClick?.();
      }}
    />
  );

  const soloBtn = (
    <button
      type="button"
      className={[
        soloClassName ?? styles.tapBtn,
        strip.soloed ? soloActiveClassName ?? styles.tapBtnSolo : "",
      ]
        .filter(Boolean)
        .join(" ")}
      title={strip.soloed ? "Wyłącz solo" : "Solo ścieżki"}
      aria-pressed={strip.soloed}
      onClick={(e) => {
        e.stopPropagation();
        callbacks.onSoloClick(e);
      }}
    >
      S
    </button>
  );

  const muteBtn = (
    <button
      type="button"
      className={[
        muteClassName ?? styles.tapBtn,
        strip.muted ? muteActiveClassName ?? styles.tapBtnMute : "",
      ]
        .filter(Boolean)
        .join(" ")}
      title={strip.muted ? "Włącz ścieżkę" : "Wycisz ścieżkę"}
      aria-pressed={strip.muted}
      onClick={(e) => {
        e.stopPropagation();
        callbacks.onMuteClick(e);
      }}
    >
      M
    </button>
  );

  const fader = (
    <div
      className={styles.faderWrap}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        callbacks.onGainReset();
      }}
      title="Dwuklik — 0.0 dB"
    >
      <Slider
        className={faderClassName ?? styles.fader}
        aria-label={`Fader ${strip.name}`}
        min={-24}
        max={12}
        step={0.5}
        value={strip.gainDb}
        onValueChange={callbacks.onGainChange}
      />
    </div>
  );

  if (layout === "mixer") {
    return (
      <div
        className={[styles.mixerStrip, strip.selected ? styles.mixerSelected : "", className]
          .filter(Boolean)
          .join(" ")}
        onClick={callbacks.onSelect}
        onContextMenu={callbacks.onContextMenu}
      >
        <div className={styles.mixerNameRow}>
          {nameRow}
          <div className={styles.tools}>
            {soloBtn}
            {muteBtn}
          </div>
        </div>
        {fader}
        <span className={styles.gainLabel}>
          {(strip.gainDb ?? 0).toFixed(1)} dB
        </span>
      </div>
    );
  }

  return (
    <div
      className={[
        styles.dockStrip,
        compact ? styles.dockStripCompact : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.dockRow} onClick={(e) => e.stopPropagation()}>
        {nameRow}
        <div className={styles.tools}>
          {soloBtn}
          {muteBtn}
        </div>
      </div>
      <div className={styles.dockFaderRow}>{fader}</div>
    </div>
  );
}
