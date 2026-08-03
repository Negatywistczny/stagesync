/**
 * Hardware output strip — gain / mute / meters (no pan / solo).
 * Stereo patches use dual L/R PeakMeter; mono uses a single column.
 * Remove via PPM / Delete — no × next to Mute (live-show hazard).
 */

import type { MouseEvent } from "react";
import type { ChannelMode, PeakHoldState } from "@stagesync/shared";
import { Button, SegmentedControl } from "@stagesync/ui";
import { DualDbReadout } from "./DualDbReadout.js";
import { meterPaintKey } from "./meterPaint.js";
import { PeakMeter } from "./PeakMeter.js";
import { VerticalFader } from "./VerticalFader.js";
import styles from "./ChannelStripControls.module.css";

export type HwOutStripProps = {
  id: string;
  name: string;
  channelOffset: number;
  channelMode: ChannelMode;
  gainDb: number;
  muted: boolean;
  selected?: boolean;
  meterDb?: number;
  meterDbR?: number;
  hold: PeakHoldState;
  onSelect?: (e: MouseEvent) => void;
  onContextMenu?: (e: MouseEvent) => void;
  onChannelModeChange?: (mode: ChannelMode) => void;
  onGainChange: (v: number) => void;
  onGainReset: () => void;
  onMuteClick: (e: MouseEvent) => void;
  onHoldClear: () => void;
};

export function HwOutStrip({
  id,
  name,
  channelOffset,
  channelMode,
  gainDb,
  muted,
  selected = false,
  meterDb = -60,
  meterDbR,
  hold,
  onSelect,
  onContextMenu,
  onChannelModeChange,
  onGainChange,
  onGainReset,
  onMuteClick,
  onHoldClear,
}: HwOutStripProps) {
  const isStereo = channelMode === "stereo";
  const chLabel = isStereo
    ? `ch ${channelOffset + 1}–${channelOffset + 2}`
    : `ch ${channelOffset + 1}`;

  return (
    <div
      className={[
        styles.mixerStrip,
        styles.masterStrip,
        selected ? styles.mixerSelected : "",
        muted ? styles.mixerMuted : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="group"
      aria-label={`HW Out ${name}`}
      aria-selected={selected}
      onClick={onSelect}
      onContextMenu={onContextMenu}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <SegmentedControl
          aria-label={`Tryb kanału ${name}`}
          className={styles.channelModeToggle}
          value={channelMode}
          onChange={(next) =>
            onChannelModeChange?.(next === "mono" ? "mono" : "stereo")
          }
          options={[
            { value: "mono", label: "M", "aria-label": "Tryb mono" },
            { value: "stereo", label: "ST", "aria-label": "Tryb stereo" },
          ]}
        />
      </div>
      <div className={styles.outputSelectSpacer} aria-hidden>
        <span className={styles.outputSelectLabel}>{chLabel}</span>
      </div>
      <div className={styles.masterPanSpacer} aria-hidden />

      <DualDbReadout
        gainDb={gainDb}
        hold={hold}
        onGainReset={onGainReset}
        onHoldClear={onHoldClear}
        gainAriaLabel={`Fader ${name}`}
        holdAriaLabel={`Peak Hold ${name}`}
      />

      <div
        className={styles.faderMeterRow}
        onClick={(e) => e.stopPropagation()}
      >
        <VerticalFader
          gainDb={gainDb}
          onGainChange={onGainChange}
          onGainReset={onGainReset}
          aria-label={`Fader ${name}`}
        />
        <PeakMeter
          db={meterDb}
          dbR={isStereo ? (meterDbR ?? -60) : undefined}
          paintKeyL={meterPaintKey("hw", id, "l")}
          paintKeyR={
            isStereo ? meterPaintKey("hw", id, "r") : undefined
          }
          aria-label={`Miernik ${name}`}
        />
      </div>

      <div
        className={styles.mixerTools}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          variant="ghost"
          iconOnly
          selected={muted}
          aria-pressed={muted}
          aria-label={`Mute ${name}`}
          onClick={onMuteClick}
        >
          M
        </Button>
      </div>

      <div
        className={[
          styles.mixerBanner,
          styles.mixerBannerAccent,
          styles.masterBanner,
        ].join(" ")}
      >
        <span className={styles.label}>{name}</span>
      </div>
    </div>
  );
}
