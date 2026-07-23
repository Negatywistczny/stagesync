/**
 * Pinned Stereo Out / master strip — dual L+R meters + master fader (no pan).
 */

import type { MasterStripCallbacks, MasterStripState } from "./channelStripTypes.js";
import { DualDbReadout } from "./DualDbReadout.js";
import { PeakMeter } from "./PeakMeter.js";
import { VerticalFader } from "./VerticalFader.js";
import styles from "./ChannelStripControls.module.css";

export type MasterStripProps = {
  state: MasterStripState;
  callbacks: MasterStripCallbacks;
};

export function MasterStrip({ state, callbacks }: MasterStripProps) {
  const gainDb = state.gainDb ?? 0;
  const holdMerged = {
    holdDb: Math.max(state.holdL.holdDb, state.holdR.holdDb),
    clipped: state.holdL.clipped || state.holdR.clipped,
  };

  return (
    <div
      className={[styles.mixerStrip, styles.masterStrip].join(" ")}
      role="group"
      aria-label="Stereo Out"
    >
      {/* Spacers align DualDb / fader with track strips (M·ST, Out, Pan). */}
      <div className={styles.channelModeSpacer} aria-hidden />
      <div className={styles.outputSelectSpacer} aria-hidden />
      <div className={styles.masterPanSpacer} aria-hidden />

      <DualDbReadout
        gainDb={gainDb}
        hold={holdMerged}
        onGainReset={callbacks.onGainReset}
        onHoldClear={() => callbacks.onHoldClear?.()}
        gainAriaLabel="Fader Stereo Out"
        holdAriaLabel="Peak Hold Stereo Out — kliknij aby wyzerować"
      />

      <div className={styles.faderMeterRow}>
        <VerticalFader
          gainDb={gainDb}
          onGainChange={callbacks.onGainChange}
          onGainReset={callbacks.onGainReset}
          aria-label="Fader Stereo Out"
        />
        <PeakMeter
          db={state.meterL}
          dbR={state.meterR}
          aria-label="Miernik Stereo Out"
        />
      </div>

      {/* Match track / Click S·M row so the bottom banner lines up. */}
      <div className={styles.mixerToolsSpacer} aria-hidden />

      <div
        className={[
          styles.mixerBanner,
          styles.mixerBannerAccent,
          styles.masterBanner,
        ].join(" ")}
      >
        <span className={styles.label}>Master</span>
      </div>
    </div>
  );
}
