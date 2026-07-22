/**
 * Client-only metronome click prefs (localStorage).
 * Volume + timbre — does not affect server transport / time authority.
 */

export const METRONOME_ACCENT_VOLUME_KEY = "stagesync.metronome.accentVolume";
export const METRONOME_BEAT_VOLUME_KEY = "stagesync.metronome.beatVolume";
export const METRONOME_TIMBRE_KEY = "stagesync.metronome.timbre";

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
};

export const DEFAULT_METRONOME_PREFS: MetronomePrefs = {
  accentVolume: 100,
  beatVolume: 100,
  timbre: "default",
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

function readVolume(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null || raw === "") return fallback;
    return clampMetronomeVolume(Number(raw));
  } catch {
    return fallback;
  }
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

  notifyMetronomePrefsChanged(next);
  return next;
}
