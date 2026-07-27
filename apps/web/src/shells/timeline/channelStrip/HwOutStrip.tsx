/**
 * Hardware output strip — gain / mute / meters (no pan / solo).
 */

import type { MouseEvent } from "react";
import type { PeakHoldState } from "@stagesync/shared";
import { Button } from "@stagesync/ui";
import { DualDbReadout } from "./DualDbReadout.js";
import { PeakMeter } from "./PeakMeter.js";
import { VerticalFader } from "./VerticalFader.js";
import styles from "./ChannelStripControls.module.css";

export type HwOutStripProps = {
  id: string;
  name: string;
  channelOffset: number;
  channelMode: "mono" | "stereo";
  gainDb: number;
  muted: boolean;
  meterDb?: number;
  meterDbR?: number;
  hold: PeakHoldState;
  onGainChange: (v: number) => void;
  onGainReset: () => void;
  onMuteClick: (e: MouseEvent) => void;
  onHoldClear: () => void;
  onRemove: () => void;
};

export function HwOutStrip({
  name,
  channelOffset,
  channelMode,
  gainDb,
  muted,
  meterDb = -60,
  meterDbR,
  hold,
  onGainChange,
  onGainReset,
  onMuteClick,
  onHoldClear,
  onRemove,
}: HwOutStripProps) {
  const chLabel =
    channelMode === "mono"
      ? `ch ${channelOffset + 1}`
      : `ch ${channelOffset + 1}–${channelOffset + 2}`;

  return (
    <div
      className={[styles.mixerStrip, styles.masterStrip].join(" ")}
      role="group"
      aria-label={`HW Out ${name}`}
    >
      <div className={styles.channelModeSpacer} aria-hidden />
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

      <div className={styles.faderMeterRow}>
        <VerticalFader
          gainDb={gainDb}
          onGainChange={onGainChange}
          onGainReset={onGainReset}
          aria-label={`Fader ${name}`}
        />
        <PeakMeter
          db={meterDb}
          dbR={meterDbR}
          aria-label={`Miernik ${name}`}
        />
      </div>

      <div className={styles.mixerTools}>
        <Button
          type="button"
          variant="ghost"
          selected={muted}
          aria-pressed={muted}
          aria-label={`Mute ${name}`}
          onClick={onMuteClick}
        >
          M
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-label={`Usuń ${name}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          ×
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
