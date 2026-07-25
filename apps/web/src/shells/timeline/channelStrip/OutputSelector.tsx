/**
 * Track / Bus mix output selector — Master | Bus N.
 * HW outs are never listed here unless a future caller passes options
 * gated by `hwOutputUiAllowed(maxChannelCount)`.
 */

import type { MixerOutputDest } from "@stagesync/shared";
import styles from "./ChannelStripControls.module.css";

export type OutputSelectorOption = {
  value: string;
  label: string;
};

export type OutputSelectorProps = {
  /** Serialized: `master` or `bus:<id>`. */
  value: string;
  options: readonly OutputSelectorOption[];
  onChange: (value: string) => void;
  "aria-label"?: string;
  disabled?: boolean;
};

export function serializeOutputDest(dest: MixerOutputDest | undefined): string {
  if (dest?.kind === "bus") return `bus:${dest.busId}`;
  if (dest?.kind === "hw_out") return `hw:${dest.hwOutputId}`;
  return "master";
}

export function parseOutputDest(value: string): MixerOutputDest {
  if (value.startsWith("bus:")) {
    const busId = value.slice(4);
    if (busId) return { kind: "bus", busId };
  }
  if (value.startsWith("hw:")) {
    const hwOutputId = value.slice(3);
    if (hwOutputId) return { kind: "hw_out", hwOutputId };
  }
  return { kind: "master" };
}

export function OutputSelector({
  value,
  options,
  onChange,
  "aria-label": ariaLabel = "Out",
  disabled = false,
}: OutputSelectorProps) {
  return (
    <label className={styles.outputSelectWrap}>
      <span className={styles.outputSelectLabel}>Out</span>
      <select
        className={styles.outputSelect}
        value={value}
        disabled={disabled || options.length <= 1}
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          onChange(e.target.value);
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
