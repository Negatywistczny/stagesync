/**
 * Shared Solo / Mute / Fader (+ pan in Mixer) for dock + vertical channel strip.
 */

import { useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Slider } from "@stagesync/ui";
import {
  resolveTrackColor,
  resolveTrackIcon,
  type PeakHoldState,
  type TrackColor,
  type TrackIcon,
} from "@stagesync/shared";
import { IconTrack } from "../../icons.js";
import type { ChannelStripCallbacks, ChannelStripState } from "./channelStripTypes.js";
import { DualDbReadout } from "./DualDbReadout.js";
import { MiddleTruncateLabel } from "./MiddleTruncateLabel.js";
import {
  OutputSelector,
  parseOutputDest,
} from "./OutputSelector.js";
import { PanKnob } from "./PanKnob.js";
import { PeakMeter } from "./PeakMeter.js";
import { TrackAppearancePicker } from "./TrackAppearancePicker.js";
import { VerticalFader } from "./VerticalFader.js";
import styles from "./ChannelStripControls.module.css";

export type ChannelStripControlsProps = {
  strip: ChannelStripState;
  callbacks: ChannelStripCallbacks;
  /** `dock` = compact horizontal; `mixer` = vertical Logic-like strip. */
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const iconBadgeRef = useRef<HTMLButtonElement>(null);
  const color = resolveTrackColor(strip.color);
  const icon = resolveTrackIcon(strip.icon);

  function onRenameKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      callbacks.onRenameCommit?.();
    } else if (e.key === "Escape") {
      e.preventDefault();
      callbacks.onRenameCancel?.();
    }
  }

  function onNameContextMenu(e: MouseEvent) {
    // WebKit/Tauri Look Up on text needs preventDefault on the text target
    // (ancestor bubble alone can still leak the native menu).
    if (callbacks.onContextMenu) {
      callbacks.onContextMenu(e);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
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
      onContextMenu={(e) => {
        // Block native edit/Look Up while renaming; custom track menu optional.
        e.preventDefault();
        e.stopPropagation();
      }}
    />
  ) : (
    <MiddleTruncateLabel
      text={strip.name}
      title={strip.name}
      className={labelClassName ?? styles.label}
      onDoubleClick={(e: MouseEvent) => {
        e.stopPropagation();
        callbacks.onNameDoubleClick?.();
      }}
      onContextMenu={onNameContextMenu}
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

  const iconBadge = (
    <button
      ref={iconBadgeRef}
      type="button"
      className={[
        styles.iconBadge,
        layout === "dock" ? styles.iconBadgeDock : "",
      ]
        .filter(Boolean)
        .join(" ")}
      title="Kolor i ikona ścieżki"
      aria-label="Kolor i ikona ścieżki"
      aria-expanded={pickerOpen}
      onClick={(e) => {
        e.stopPropagation();
        setPickerOpen((v) => !v);
      }}
    >
      <IconTrack icon={icon} />
    </button>
  );

  const appearancePicker =
    pickerOpen && callbacks.onColorChange && callbacks.onIconChange ? (
      <TrackAppearancePicker
        anchorRef={iconBadgeRef}
        placement={layout === "mixer" ? "above" : "below"}
        color={color}
        icon={icon}
        onColorChange={(c: TrackColor) => {
          callbacks.onColorChange?.(c);
        }}
        onIconChange={(i: TrackIcon) => {
          callbacks.onIconChange?.(i);
        }}
        onClose={() => setPickerOpen(false)}
      />
    ) : null;

  const dockFader = (
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
    const pan = strip.pan ?? 0;
    const gainDb = strip.gainDb ?? 0;
    const channelMode = strip.channelMode === "mono" ? "mono" : "stereo";
    const isStereo = channelMode === "stereo";
    const hold: PeakHoldState = strip.hold ?? {
      holdDb: -60,
      clipped: false,
    };
    const isBus = strip.kind === "bus";
    const outputOptions = strip.outputOptions ?? [
      { value: "master", label: "Master" },
    ];
    return (
      <div
        className={[
          styles.mixerStrip,
          isBus ? styles.busStrip : "",
          strip.selected ? styles.mixerSelected : "",
          strip.muted ? styles.mixerMuted : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={
          isBus
            ? undefined
            : { ["--tl-track-color" as string]: color }
        }
        onClick={callbacks.onSelect}
        onContextMenu={callbacks.onContextMenu}
      >
        <div
          className={styles.channelModeToggle}
          role="group"
          aria-label={`Tryb kanału ${strip.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className={[
              styles.channelModeBtn,
              channelMode === "mono" ? styles.channelModeBtnActive : "",
            ]
              .filter(Boolean)
              .join(" ")}
            title="Mono"
            aria-label="Mono"
            aria-pressed={channelMode === "mono"}
            onClick={() => callbacks.onChannelModeChange?.("mono")}
          >
            M
          </button>
          <button
            type="button"
            className={[
              styles.channelModeBtn,
              channelMode === "stereo" ? styles.channelModeBtnActive : "",
            ]
              .filter(Boolean)
              .join(" ")}
            title="Stereo"
            aria-label="Stereo"
            aria-pressed={channelMode === "stereo"}
            onClick={() => callbacks.onChannelModeChange?.("stereo")}
          >
            ST
          </button>
        </div>

        <OutputSelector
          value={strip.outputValue ?? "master"}
          options={outputOptions}
          aria-label={`Wyjście ${strip.name}`}
          onChange={(v) => callbacks.onOutputChange?.(parseOutputDest(v))}
        />

        <PanKnob
          pan={pan}
          label={isStereo ? "BAL" : "PAN"}
          onPanChange={(v) => callbacks.onPanChange?.(v)}
          onPanReset={() => callbacks.onPanReset?.()}
          aria-label={`${isStereo ? "Balance" : "Pan"} ${strip.name}`}
        />

        <DualDbReadout
          gainDb={gainDb}
          hold={hold}
          onGainReset={callbacks.onGainReset}
          onHoldClear={() => callbacks.onHoldClear?.()}
          gainAriaLabel={`Fader ${strip.name}`}
          holdAriaLabel={`Peak Hold ${strip.name} — kliknij aby wyzerować`}
        />

        <div className={styles.faderMeterRow} onClick={(e) => e.stopPropagation()}>
          <VerticalFader
            gainDb={gainDb}
            onGainChange={callbacks.onGainChange}
            onGainReset={callbacks.onGainReset}
            aria-label={`Fader ${strip.name}`}
            className={faderClassName}
          />
          <PeakMeter
            db={strip.meterDb ?? -60}
            dbR={isStereo ? (strip.meterDbR ?? -60) : undefined}
            showChannelLabels={false}
            aria-label={`Miernik ${strip.name}`}
          />
        </div>

        <div className={styles.mixerTools} onClick={(e) => e.stopPropagation()}>
          {soloBtn}
          {muteBtn}
        </div>

        <div
          className={[
            styles.mixerBanner,
            styles.mixerBannerAccent,
            isBus ? styles.busBanner : styles.mixerBannerColor,
          ].join(" ")}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.bannerAnchor}>
            {isBus ? (
              <span className={styles.busBadge} title="Bus">
                BUS
              </span>
            ) : (
              iconBadge
            )}
            {nameRow}
            {!isBus ? appearancePicker : null}
          </div>
        </div>
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
      style={{ ["--tl-track-color" as string]: color }}
      onClick={(e) => {
        callbacks.onSelect(e);
        // Avoid double-fire with TimelineShell dockCell (⌘/Ctrl toggle).
        e.stopPropagation();
      }}
      onContextMenu={callbacks.onContextMenu}
    >
      <div className={styles.dockRow}>
        <div className={styles.dockIconAnchor}>
          {iconBadge}
          {appearancePicker}
        </div>
        {nameRow}
        <div className={styles.tools} onClick={(e) => e.stopPropagation()}>
          {soloBtn}
          {muteBtn}
        </div>
      </div>
      {!compact ? <div className={styles.dockFaderRow}>{dockFader}</div> : null}
    </div>
  );
}
