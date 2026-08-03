/**
 * Horizontal track fader — same Logic/PT taper as {@link VerticalFader} (Mixer).
 * Bottom (t = 0) → gain floor (−∞ / mute); top → +6 dB.
 */

import {
  clampFaderGainDb,
  dbToFaderTaper,
  faderTaperToDb,
  FADER_GAIN_FLOOR_DB,
  FADER_TAPER_DB_MAX,
} from "@stagesync/shared";
import { Slider } from "@stagesync/ui";

/** Taper resolution for &lt;input type="range"&gt; (matches VerticalFader keyboard ~0.01). */
const TAPER_STEP = 0.01;

export type TaperGainSliderProps = {
  gainDb: number;
  onGainChange: (gainDb: number) => void;
  "aria-label": string;
  className?: string;
  disabled?: boolean;
};

export function TaperGainSlider({
  gainDb,
  onGainChange,
  "aria-label": ariaLabel,
  className,
  disabled,
}: TaperGainSliderProps) {
  const stored = clampFaderGainDb(gainDb);
  const t = dbToFaderTaper(stored);

  return (
    <Slider
      className={className}
      aria-label={ariaLabel}
      min={0}
      max={1}
      step={TAPER_STEP}
      value={t}
      disabled={disabled}
      aria-valuemin={FADER_GAIN_FLOOR_DB}
      aria-valuemax={FADER_TAPER_DB_MAX}
      aria-valuenow={Math.round(stored * 10) / 10}
      aria-valuetext={`${stored.toFixed(1)} dB`}
      onValueChange={(nextT) => {
        onGainChange(clampFaderGainDb(faderTaperToDb(nextT)));
      }}
    />
  );
}
