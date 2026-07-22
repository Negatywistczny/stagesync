/**
 * Circle-of-fifths transpose + local instrument pitch presets (v4 StageSyncTranspose).
 * Pure functions — no Date/clock.
 */

import type { KeySignature } from "./schema.js";

/** Lista 1 — koło kwint Bbb → F## */
const CIRCLE_CHAIN = [
  "Bbb",
  "Fb",
  "Cb",
  "Gb",
  "Db",
  "Ab",
  "Eb",
  "Bb",
  "F",
  "C",
  "G",
  "D",
  "A",
  "E",
  "B",
  "F#",
  "C#",
  "G#",
  "D#",
  "A#",
  "E#",
  "B#",
  "F##",
] as const;

const MAJOR_BY_SEMITONE = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const;

const MINOR_BY_SEMITONE = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "Bb",
  "B",
] as const;

const CHROMATIC = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

const NOTE_LETTER_SEMI: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const CIRCLE_INDEX: Record<string, number> = {};
CIRCLE_CHAIN.forEach((name, i) => {
  CIRCLE_INDEX[name] = i;
});

function isMajorMode(mode: string | undefined): boolean {
  return String(mode || "").toLowerCase() === "major";
}

function namesForMode(mode: string | undefined): readonly string[] {
  return isMajorMode(mode) ? MAJOR_BY_SEMITONE : MINOR_BY_SEMITONE;
}

/** Litera + #/b → pitch class 0..11. */
export function parseTonicSymbol(tonic: string): number | null {
  if (!tonic) return null;
  const m = String(tonic)
    .trim()
    .match(/^([A-Ga-g])([#b♯♭]*)$/);
  if (!m) return null;
  const base = NOTE_LETTER_SEMI[m[1]!.toUpperCase()];
  if (base == null) return null;
  let delta = 0;
  for (const ch of m[2] || "") {
    if (ch === "#" || ch === "♯") delta += 1;
    else if (ch === "b" || ch === "♭") delta -= 1;
  }
  return ((base + delta) % 12 + 12) % 12;
}

/** Map tonic+mode onto major/minor spell lists (transpose spelling). */
function canonicalizeTransposeTonic(
  tonic: string,
  mode: string | undefined,
): string | null {
  const idx = parseTonicSymbol(tonic);
  if (idx == null) return null;
  return namesForMode(mode)[idx] ?? null;
}

export function clampSemitoneOffset(n: unknown): number {
  const v = typeof n === "number" ? n : parseInt(String(n), 10);
  if (!Number.isFinite(v)) return 0;
  return Math.max(-12, Math.min(12, v));
}

/** Presety lokalnego stroju (C / B♭ / E♭). */
export const INSTRUMENT_PITCH_PRESETS = Object.freeze({
  concert: 0,
  bb: 2,
  eb: 9,
} as const);

export type InstrumentPitchMode = keyof typeof INSTRUMENT_PITCH_PRESETS | "manual";

export const INSTRUMENT_PITCH_MANUAL_MIN = -6;
export const INSTRUMENT_PITCH_MANUAL_MAX = 6;

export function clampManualInstrumentPitch(n: unknown): number {
  const v = typeof n === "number" ? n : parseInt(String(n), 10);
  if (!Number.isFinite(v)) return 0;
  return Math.max(
    INSTRUMENT_PITCH_MANUAL_MIN,
    Math.min(INSTRUMENT_PITCH_MANUAL_MAX, v),
  );
}

export function isInstrumentPitchMode(mode: unknown): mode is InstrumentPitchMode {
  return (
    mode === "manual" ||
    (typeof mode === "string" &&
      Object.prototype.hasOwnProperty.call(INSTRUMENT_PITCH_PRESETS, mode))
  );
}

export function resolveInstrumentPitchOffset(
  mode: InstrumentPitchMode | string,
  manualSemitones = 0,
): number {
  if (mode === "manual") return clampManualInstrumentPitch(manualSemitones);
  if (
    typeof mode === "string" &&
    Object.prototype.hasOwnProperty.call(INSTRUMENT_PITCH_PRESETS, mode)
  ) {
    return INSTRUMENT_PITCH_PRESETS[mode as keyof typeof INSTRUMENT_PITCH_PRESETS];
  }
  return 0;
}

function circleDistanceToSemitones(circleDistance: number): number {
  if (!circleDistance) return 0;
  let semi = ((circleDistance * 7) % 12 + 12) % 12;
  if (circleDistance > 0 && semi > 6) return semi;
  if (semi > 6) semi -= 12;
  return semi;
}

export type TransposeResolve = {
  semitoneOffset: number;
  /** Circle-spelling semitones for chords. */
  semitones: number;
  originalKey: string | null;
  targetKey: string | null;
  circleDistance: number;
};

export function resolveTranspose(
  key: KeySignature | { tonic: string; mode: string } | null | undefined,
  semitoneOffset: number,
): TransposeResolve {
  const mode = key?.mode === "major" ? "major" : "minor";
  const x = clampSemitoneOffset(semitoneOffset);
  const names = namesForMode(mode);
  const original = key?.tonic
    ? canonicalizeTransposeTonic(key.tonic, mode)
    : null;

  if (!original) {
    return {
      semitoneOffset: x,
      semitones: 0,
      originalKey: null,
      targetKey: null,
      circleDistance: 0,
    };
  }

  const origSemi = parseTonicSymbol(original);
  if (origSemi == null) {
    return {
      semitoneOffset: x,
      semitones: 0,
      originalKey: original,
      targetKey: null,
      circleDistance: 0,
    };
  }
  const targetSemi = ((origSemi + x) % 12 + 12) % 12;
  const targetKey = names[targetSemi] ?? null;

  const oldCircle = CIRCLE_INDEX[original];
  const newCircle = targetKey != null ? CIRCLE_INDEX[targetKey] : undefined;
  const circleDistance =
    oldCircle != null && newCircle != null ? newCircle - oldCircle : 0;
  const semitones = circleDistanceToSemitones(circleDistance);

  return {
    semitoneOffset: x,
    semitones,
    originalKey: original,
    targetKey,
    circleDistance,
  };
}

function spellPitchClass(semitoneIdx: number, targetKey: string | null): string {
  const i = ((semitoneIdx % 12) + 12) % 12;
  const anchor = targetKey ? CIRCLE_INDEX[targetKey] : CIRCLE_INDEX.C;
  if (anchor == null) return CHROMATIC[i] ?? "C";

  let best: string | null = null;
  let bestDist = Infinity;
  for (const name of CIRCLE_CHAIN) {
    if (parseTonicSymbol(name) !== i) continue;
    const dist = Math.abs(CIRCLE_INDEX[name]! - anchor);
    if (dist < bestDist) {
      bestDist = dist;
      best = name;
    }
  }
  return best || CHROMATIC[i] || "C";
}

type ParsedChord = {
  rootIdx: number;
  suffix: string;
  bassIdx: number | null;
};

function parseChordParts(chord: string): ParsedChord | null {
  const s = String(chord || "").trim();
  if (!s || s === "—") return null;

  const slash = s.indexOf("/");
  const head = slash >= 0 ? s.slice(0, slash) : s;
  const bass = slash >= 0 ? s.slice(slash + 1) : null;

  const m = head.match(/^([A-Ga-g][#b♯♭]{0,2})(.*)$/i);
  if (!m) return null;

  const rootIdx = parseTonicSymbol(m[1]!);
  if (rootIdx == null) return null;

  const bassIdx = bass != null ? parseTonicSymbol(bass) : null;
  if (bass != null && bassIdx == null) return null;

  return {
    rootIdx,
    suffix: m[2] || "",
    bassIdx,
  };
}

export function transposeChord(
  chord: string,
  semitones: number,
  options: { targetKey?: string | null } = {},
): string {
  if (!semitones) return chord;
  const targetKey = options.targetKey ?? null;
  const parsed = parseChordParts(chord);
  if (!parsed) return chord;

  let out =
    spellPitchClass(parsed.rootIdx + semitones, targetKey) + parsed.suffix;
  if (parsed.bassIdx != null) {
    out += `/${spellPitchClass(parsed.bassIdx + semitones, targetKey)}`;
  }
  return out;
}

/**
 * Apply local instrument pitch to a chord symbol (before display formatting).
 * Without a song key, uses chromatic spelling with the raw offset.
 */
export function applyInstrumentPitchToChord(
  chord: string,
  pitchMode: InstrumentPitchMode | string,
  manualSemitones: number,
  key: KeySignature | null | undefined,
  teamSemitones = 0,
): string {
  if (chord == null || chord === "—" || /^[0-9]+$/.test(String(chord))) {
    return String(chord ?? "—");
  }
  const local = resolveInstrumentPitchOffset(pitchMode, manualSemitones);
  const offset = local + clampSemitoneOffset(teamSemitones);
  if (!offset) return chord;
  if (key?.tonic) {
    const resolved = resolveTranspose(key, offset);
    if (!resolved.semitones) return chord;
    return transposeChord(chord, resolved.semitones, {
      targetKey: resolved.targetKey,
    });
  }
  return transposeChord(chord, offset);
}
