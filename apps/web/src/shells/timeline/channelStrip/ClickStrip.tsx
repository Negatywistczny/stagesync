/**
 * Mixer Click strip — master click volume + Mute ↔ metronomeOn.
 * Direct Cue path (not Master bus). Mixer-only, before Stereo Out.
 */

import type { PeakHoldState } from "@stagesync/shared";
import { DualDbReadout } from "./DualDbReadout.js";
import { PeakMeter } from "./PeakMeter.js";
import { VerticalFader } from "./VerticalFader.js";
import styles from "./ChannelStripControls.module.css";

export type ClickStripState = {
  /** Mute Click = !metronomeOn. */
  muted: boolean;
  gainDb: number;
  meterDb: number;
  hold: PeakHoldState;
};

export type ClickStripCallbacks = {
  onMuteClick: () => void;
  onGainChange: (gainDb: number) => void;
  onGainReset: () => void;
  onHoldClear: () => void;
};

export type ClickStripProps = {
  state: ClickStripState;
  callbacks: ClickStripCallbacks;
};

export function ClickStrip({ state, callbacks }: ClickStripProps) {
  const gainDb = state.gainDb ?? 0;
  return (
    <div
      className={[styles.mixerStrip, styles.clickStrip].join(" ")}
      role="group"
      aria-label="Click"
    >
      {/* Spacers align DualDb / fader with track strips (M·ST, Out, Pan). */}
      <div className={styles.channelModeSpacer} aria-hidden />
      <div className={styles.outputSelectSpacer} aria-hidden />
      <div className={styles.masterPanSpacer} aria-hidden />

      <DualDbReadout
        gainDb={gainDb}
        hold={state.hold}
        onGainReset={callbacks.onGainReset}
        onHoldClear={callbacks.onHoldClear}
        gainAriaLabel="Fader Click"
        holdAriaLabel="Peak Hold Click — kliknij aby wyzerować"
      />

      <div className={styles.faderMeterRow}>
        <VerticalFader
          gainDb={gainDb}
          onGainChange={callbacks.onGainChange}
          onGainReset={callbacks.onGainReset}
          aria-label="Fader Click"
        />
        <PeakMeter db={state.meterDb} aria-label="Miernik Click" />
      </div>

      <div className={styles.mixerTools}>
        <button
          type="button"
          className={[
            styles.tapBtn,
            state.muted ? styles.tapBtnMute : "",
          ]
            .filter(Boolean)
            .join(" ")}
          title={
            state.muted
              ? "Włącz Click (metronom)"
              : "Wycisz Click (metronom)"
          }
          aria-pressed={state.muted}
          aria-label="Mute Click"
          onClick={() => callbacks.onMuteClick()}
        >
          M
        </button>
      </div>

      <div
        className={[
          styles.mixerBanner,
          styles.mixerBannerAccent,
          styles.clickBanner,
        ].join(" ")}
      >
        <span className={styles.label}>Click</span>
      </div>
    </div>
  );
}
