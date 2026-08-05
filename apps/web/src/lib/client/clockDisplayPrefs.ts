/**
 * Client-only clock readout format (localStorage).
 * Presentation only — transport ticks remain SSOT on the server.
 */

import {
  ticksToBbt,
  ticksToMs,
  toDisplayBar,
  type TimeSignature,
} from "@stagesync/shared";

export const CLOCK_DISPLAY_STORAGE_KEY = "stagesync.clock.displayFormat";

export const CLOCK_DISPLAY_CHANGED_EVENT = "stagesync:clock-display-changed";

export type ClockDisplayFormat = "bbt" | "time";

export function isClockDisplayFormat(value: unknown): value is ClockDisplayFormat {
  return value === "bbt" || value === "time";
}

export function getStoredClockDisplayFormat(): ClockDisplayFormat {
  try {
    const raw = localStorage.getItem(CLOCK_DISPLAY_STORAGE_KEY);
    if (isClockDisplayFormat(raw)) return raw;
  } catch {
    /* private mode */
  }
  return "bbt";
}

function notifyClockDisplayChanged(format: ClockDisplayFormat): void {
  try {
    window.dispatchEvent(
      new CustomEvent(CLOCK_DISPLAY_CHANGED_EVENT, { detail: { format } }),
    );
  } catch {
    /* non-DOM / SSR */
  }
}

export function setStoredClockDisplayFormat(format: ClockDisplayFormat): void {
  try {
    if (format === "bbt") localStorage.removeItem(CLOCK_DISPLAY_STORAGE_KEY);
    else localStorage.setItem(CLOCK_DISPLAY_STORAGE_KEY, format);
  } catch {
    /* private mode */
  }
  notifyClockDisplayChanged(format);
}

/** MM:SS.mmm (optional leading − for pre-roll). */
export function formatMmSsMs(ms: number): string {
  if (!Number.isFinite(ms)) return "00:00.000";
  const neg = ms < 0;
  const abs = Math.abs(ms);
  const totalMs = Math.round(abs);
  const mins = Math.floor(totalMs / 60_000);
  const secs = Math.floor((totalMs % 60_000) / 1000);
  const millis = totalMs % 1000;
  const body = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
  return neg ? `-${body}` : body;
}

export type FormatClockDisplayInput = {
  ticks: number;
  bpm: number;
  timeSignature: TimeSignature;
  ppq: number;
  format: ClockDisplayFormat;
};

/** Format transport ticks for chrome readouts (BBT or wall-clock projection). */
export function formatClockDisplay(input: FormatClockDisplayInput): string {
  if (input.format === "time") {
    const ms = ticksToMs(
      input.ticks,
      input.bpm,
      input.timeSignature,
      input.ppq,
    );
    return formatMmSsMs(ms);
  }
  const bbt = ticksToBbt(input.ticks, input.timeSignature, input.ppq);
  // Display bar.beat only — ticks stay in the engine, not the chrome readout.
  return `${toDisplayBar(bbt.bar)}.${bbt.beat}`;
}
