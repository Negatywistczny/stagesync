/**
 * Client-only metronome click prefs (localStorage).
 * Volume + timbre + master click gain + on/off — does not affect server transport.
 */

import {
  clampFaderGainDb,
  FADER_GAIN_FLOOR_DB,
  gainDbToLinear,
} from "@stagesync/shared";

export const METRONOME_ACCENT_VOLUME_KEY = "stagesync.metronome.accentVolume";
export const METRONOME_BEAT_VOLUME_KEY = "stagesync.metronome.beatVolume";
export const METRONOME_TIMBRE_KEY = "stagesync.metronome.timbre";
/** Session: Mute Click ↔ metronomeOn (survives setlist song change). */
export const METRONOME_ON_KEY = "stagesync.metronome.on";
/** Mixer Click strip master gain (dB); scales accent+beat sum. */
export const METRONOME_MASTER_GAIN_DB_KEY = "stagesync.metronome.masterGainDb";

export const METRONOME_PREFS_CHANGED_EVENT = "stagesync:metronome-prefs-changed";

export const METRONOME_VOLUME_MIN = 0;
export const METRONOME_VOLUME_MAX = 100;

export type MetronomeTimbre = "default" | "woodblock" | "bell";

export type MetronomePrefs = {
  /** Accent (beat 1) volume 0…100. */
  accentVolume: number;
  /** Other beats volume 0…100. */
  beatVolume: number;
  timbre: MetronomeTimbre;
  /**
   * Master Click fader (Mixer) — multiplies accent+beat levels.
   * 0 dB = unity relative to Settings balance.
   */
  masterGainDb: number;
};

export const DEFAULT_METRONOME_PREFS: MetronomePrefs = {
  accentVolume: 100,
  beatVolume: 100,
  timbre: "default",
  masterGainDb: 0,
};

export function isMetronomeTimbre(value: unknown): value is MetronomeTimbre {
  return value === "default" || value === "woodblock" || value === "bell";
}

export function clampMetronomeVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_METRONOME_PREFS.accentVolume;
  return Math.min(
    METRONOME_VOLUME_MAX,
    Math.max(METRONOME_VOLUME_MIN, Math.round(value)),
  );
}

export function clampMasterClickGainDb(value: number): number {
  return clampFaderGainDb(value);
}

function readVolume(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null || raw === "") return fallback;
    return clampMetronomeVolume(Number(raw));
  } catch {
    return fallback;
  }
}

function readMasterGainDb(): number {
  try {
    const raw = localStorage.getItem(METRONOME_MASTER_GAIN_DB_KEY);
    if (raw == null || raw === "") return DEFAULT_METRONOME_PREFS.masterGainDb;
    return clampMasterClickGainDb(Number(raw));
  } catch {
    return DEFAULT_METRONOME_PREFS.masterGainDb;
  }
}

/** Persist Mute Click / K toggle across songs in the session. */
export function getMetronomeOn(): boolean {
  try {
    return localStorage.getItem(METRONOME_ON_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMetronomeOn(on: boolean): boolean {
  try {
    if (on) localStorage.setItem(METRONOME_ON_KEY, "1");
    else localStorage.removeItem(METRONOME_ON_KEY);
  } catch {
    /* private mode */
  }
  return on;
}

export function getMetronomePrefs(): MetronomePrefs {
  let timbre: MetronomeTimbre = DEFAULT_METRONOME_PREFS.timbre;
  try {
    const raw = localStorage.getItem(METRONOME_TIMBRE_KEY);
    if (isMetronomeTimbre(raw)) timbre = raw;
  } catch {
    /* private mode */
  }
  return {
    accentVolume: readVolume(
      METRONOME_ACCENT_VOLUME_KEY,
      DEFAULT_METRONOME_PREFS.accentVolume,
    ),
    beatVolume: readVolume(
      METRONOME_BEAT_VOLUME_KEY,
      DEFAULT_METRONOME_PREFS.beatVolume,
    ),
    timbre,
    masterGainDb: readMasterGainDb(),
  };
}

function notifyMetronomePrefsChanged(prefs: MetronomePrefs): void {
  try {
    window.dispatchEvent(
      new CustomEvent(METRONOME_PREFS_CHANGED_EVENT, { detail: prefs }),
    );
  } catch {
    /* non-DOM / SSR */
  }
}

function writeVolume(key: string, value: number, defaultValue: number): void {
  const clamped = clampMetronomeVolume(value);
  try {
    if (clamped === defaultValue) localStorage.removeItem(key);
    else localStorage.setItem(key, String(clamped));
  } catch {
    /* private mode */
  }
}

export function setMetronomePrefs(partial: Partial<MetronomePrefs>): MetronomePrefs {
  const current = getMetronomePrefs();
  const next: MetronomePrefs = {
    accentVolume: clampMetronomeVolume(
      partial.accentVolume ?? current.accentVolume,
    ),
    beatVolume: clampMetronomeVolume(partial.beatVolume ?? current.beatVolume),
    timbre: isMetronomeTimbre(partial.timbre)
      ? partial.timbre
      : current.timbre,
    masterGainDb: clampMasterClickGainDb(
      partial.masterGainDb ?? current.masterGainDb,
    ),
  };

  writeVolume(
    METRONOME_ACCENT_VOLUME_KEY,
    next.accentVolume,
    DEFAULT_METRONOME_PREFS.accentVolume,
  );
  writeVolume(
    METRONOME_BEAT_VOLUME_KEY,
    next.beatVolume,
    DEFAULT_METRONOME_PREFS.beatVolume,
  );

  try {
    if (next.timbre === DEFAULT_METRONOME_PREFS.timbre) {
      localStorage.removeItem(METRONOME_TIMBRE_KEY);
    } else {
      localStorage.setItem(METRONOME_TIMBRE_KEY, next.timbre);
    }
  } catch {
    /* private mode */
  }

  try {
    if (
      !Number.isFinite(next.masterGainDb) ||
      Math.abs(next.masterGainDb) < 1e-6
    ) {
      localStorage.removeItem(METRONOME_MASTER_GAIN_DB_KEY);
    } else {
      localStorage.setItem(
        METRONOME_MASTER_GAIN_DB_KEY,
        String(next.masterGainDb),
      );
    }
  } catch {
    /* private mode */
  }

  notifyMetronomePrefsChanged(next);
  return next;
}

/** Linear multiplier from Mixer Click fader (0 dB → 1). Floor → near-zero. */
export function masterClickGainLinear(prefs?: MetronomePrefs): number {
  const db = (prefs ?? getMetronomePrefs()).masterGainDb;
  if (!Number.isFinite(db) || db <= FADER_GAIN_FLOOR_DB) return 0;
  return gainDbToLinear(db);
}
