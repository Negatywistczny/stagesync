/**
 * Closed DAW track color + icon palettes (Mixer banner, Timeline dock / waveform).
 * Fail-fast Zod enums on project edges; defaults for new tracks.
 */

import { z } from "zod";

/** ~16 Logic/PT-style lane colors (hex stored in project JSON). */
export const TRACK_COLORS = [
  "#E74C3C",
  "#E67E22",
  "#F1C40F",
  "#2ECC71",
  "#1ABC9C",
  "#3498DB",
  "#2980B9",
  "#9B59B6",
  "#8E44AD",
  "#E91E63",
  "#FF7043",
  "#795548",
  "#607D8B",
  "#00BCD4",
  "#8BC34A",
  "#FFC107",
] as const;

export type TrackColor = (typeof TRACK_COLORS)[number];

export const TrackColorSchema = z.enum(TRACK_COLORS);

export const DEFAULT_TRACK_COLOR: TrackColor = TRACK_COLORS[5]; // blue

export const TRACK_ICONS = [
  "mic",
  "vocal",
  "guitar",
  "bass",
  "drums",
  "perc",
  "keys",
  "piano",
  "synth",
  "brass",
  "strings",
  "click",
  "fx",
  "amp",
  "other",
] as const;

export type TrackIcon = (typeof TRACK_ICONS)[number];

export const TrackIconSchema = z.enum(TRACK_ICONS);

export const DEFAULT_TRACK_ICON: TrackIcon = "mic";

const COLOR_SET = new Set<string>(TRACK_COLORS);
const ICON_SET = new Set<string>(TRACK_ICONS);

/** Resolve stored / missing color → closed palette value. */
export function resolveTrackColor(
  color: string | undefined | null,
): TrackColor {
  if (color != null && COLOR_SET.has(color)) return color as TrackColor;
  return DEFAULT_TRACK_COLOR;
}

/** Resolve stored / missing icon → closed enum. */
export function resolveTrackIcon(icon: string | undefined | null): TrackIcon {
  if (icon != null && ICON_SET.has(icon)) return icon as TrackIcon;
  return DEFAULT_TRACK_ICON;
}

/** Cycle palette by track index (new tracks). */
export function trackColorForIndex(index: number): TrackColor {
  const i =
    Number.isFinite(index) && index >= 0
      ? Math.floor(index) % TRACK_COLORS.length
      : 0;
  return TRACK_COLORS[i]!;
}

/** Polish labels for icon picker. */
export const TRACK_ICON_LABELS: Record<TrackIcon, string> = {
  mic: "Mikrofon",
  vocal: "Wokal",
  guitar: "Gitara",
  bass: "Bas",
  drums: "Perkusja",
  perc: "Perc",
  keys: "Klawisze",
  piano: "Fortepian",
  synth: "Synth",
  brass: "Blacha",
  strings: "Smyczki",
  click: "Click",
  fx: "FX",
  amp: "Amp",
  other: "Inne",
};
