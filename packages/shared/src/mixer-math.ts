/**
 * Pure mixer math — pan, VU scale, Logic/PT-style fader taper.
 * No DOM / AudioContext.
 */

/** Full left … full right for StereoPannerNode / True Balance. */
export const PAN_MIN = -1;
export const PAN_MAX = 1;

/**
 * Linear gain for stereo → mono downmix (L+R each × this).
 * −3 dB ≈ 1/√2 so equal-power mono sum stays near unity.
 */
export const STEREO_DOWNMIX_LINEAR = Math.SQRT1_2;

/** VU / peak meter display range (dBFS-ish). */
export const METER_DB_MIN = -60;
export const METER_DB_MAX = 6;

/**
 * Practical mute floor stored in schema / GainNode (−∞ on the taper).
 * Matches {@link gainDbToLinear} clamp and AudioTrack.gainDb min.
 */
export const FADER_GAIN_FLOOR_DB = -60;

/** Top of fader taper (+6 dB headroom). */
export const FADER_TAPER_DB_MAX = 6;

/** Unity gain mark on the taper (t = 0.75). */
export const FADER_TAPER_UNITY_T = 0.75;

/**
 * Canonical taper anchors: t ∈ [0,1] (0 = bottom, 1 = top) ↔ dB.
 * Highest mouse resolution near −10…+6 dB.
 */
const FADER_ANCHORS: ReadonlyArray<{ readonly t: number; readonly db: number }> =
  [
    { t: 0, db: Number.NEGATIVE_INFINITY },
    { t: 0.08, db: -48 },
    { t: 0.25, db: -24 },
    { t: 0.5, db: -10 },
    { t: 0.75, db: 0 },
    { t: 1, db: FADER_TAPER_DB_MAX },
  ];

/** Tick marks at taper heights (UI labels). */
export const FADER_TICK_DBS: readonly number[] = [
  6, 3, 0, -3, -6, -10, -15, -20, -30, -40, Number.NEGATIVE_INFINITY,
];

export type MeterPeakBand = "safe" | "warn" | "clip";

/** Clamp stereo pan to −1…+1; non-finite → 0 (center). */
export function clampPan(pan: number | undefined | null): number {
  if (pan == null || !Number.isFinite(pan)) return 0;
  return Math.min(PAN_MAX, Math.max(PAN_MIN, pan));
}

/**
 * True Balance gains (−1…+1): attenuates the opposite side, center = unity.
 * Not equal-power StereoPanner law — full left leaves R at 0, L at 1.
 */
export function balanceGains(bal: number): { l: number; r: number } {
  const b = clampPan(bal);
  return {
    l: b <= 0 ? 1 : 1 - b,
    r: b >= 0 ? 1 : 1 + b,
  };
}

/**
 * Peak linear amplitude (0…∞) → meter dB, floored at {@link METER_DB_MIN}.
 * Zero / negative → {@link METER_DB_MIN}.
 */
export function linearPeakToMeterDb(peak: number): number {
  if (!(peak > 0) || !Number.isFinite(peak)) return METER_DB_MIN;
  const db = 20 * Math.log10(peak);
  if (!Number.isFinite(db)) return METER_DB_MIN;
  return Math.min(METER_DB_MAX, Math.max(METER_DB_MIN, db));
}

/**
 * Meter dB (−60…+6) → unit height 0…1 for a vertical bar.
 */
export function meterDbToUnit(db: number): number {
  if (!Number.isFinite(db)) return 0;
  const clamped = Math.min(METER_DB_MAX, Math.max(METER_DB_MIN, db));
  return (clamped - METER_DB_MIN) / (METER_DB_MAX - METER_DB_MIN);
}

/**
 * Peak band for LED meter colour: green &lt; −6, yellow −6…0, red &gt; 0.
 */
export function meterDbPeakBand(db: number): MeterPeakBand {
  if (!(db > Number.NEGATIVE_INFINITY) || !Number.isFinite(db)) return "safe";
  if (db > 0) return "clip";
  if (db >= -6) return "warn";
  return "safe";
}

/** Finite dB for schema / GainNode (−∞ → floor). */
export function clampFaderGainDb(db: number): number {
  if (!Number.isFinite(db)) return FADER_GAIN_FLOOR_DB;
  return Math.min(FADER_TAPER_DB_MAX, Math.max(FADER_GAIN_FLOOR_DB, db));
}

function lerp(a: number, b: number, u: number): number {
  return a + (b - a) * u;
}

/**
 * Fader position t ∈ [0,1] → dB.
 * t = 0 → −∞; t = 0.75 → 0 dB; t = 1 → +6 dB.
 * Mute segment (0…0.08) uses log amplitude so resolution stays near the floor.
 */
export function faderTaperToDb(t: number): number {
  if (!Number.isFinite(t)) return Number.NEGATIVE_INFINITY;
  const x = Math.min(1, Math.max(0, t));
  if (x <= 0) return Number.NEGATIVE_INFINITY;
  if (x >= 1) return FADER_TAPER_DB_MAX;

  for (let i = 0; i < FADER_ANCHORS.length - 1; i++) {
    const a = FADER_ANCHORS[i]!;
    const b = FADER_ANCHORS[i + 1]!;
    if (x > b.t) continue;
    if (x === a.t) return a.db;
    const u = (x - a.t) / (b.t - a.t);
    if (!Number.isFinite(a.db)) {
      // 0 → 0.08: db = −48 + 20·log10(t / 0.08)
      return b.db + 20 * Math.log10(Math.max(1e-30, x / b.t));
    }
    return lerp(a.db, b.db, u);
  }
  return FADER_TAPER_DB_MAX;
}

/**
 * dB → fader position t ∈ [0,1].
 * −∞ / ≤ floor → 0; ≥ +6 → 1.
 */
export function dbToFaderTaper(db: number): number {
  if (!Number.isFinite(db)) return 0;
  if (db >= FADER_TAPER_DB_MAX) return 1;
  if (db <= FADER_GAIN_FLOOR_DB) return 0;

  for (let i = 0; i < FADER_ANCHORS.length - 1; i++) {
    const a = FADER_ANCHORS[i]!;
    const b = FADER_ANCHORS[i + 1]!;
    if (!Number.isFinite(a.db)) {
      // Inverse of mute-segment log: t = 0.08 · 10^((db+48)/20)
      if (db < b.db) {
        const t = b.t * Math.pow(10, (db - b.db) / 20);
        return Math.min(b.t, Math.max(0, t));
      }
      continue;
    }
    if (db > b.db) continue;
    if (db === a.db) return a.t;
    const u = (db - a.db) / (b.db - a.db);
    return lerp(a.t, b.t, u);
  }
  return 1;
}

/** Tick / readout label (`+6`, `0`, `−3`, `−∞`). */
export function formatFaderTickLabel(db: number): string {
  if (!Number.isFinite(db)) return "−∞";
  if (db > 0) return `+${db}`;
  if (db === 0) return "0";
  return `−${Math.abs(db)}`;
}

/** Peak hold latch — max since last reset; clip = any sample &gt; 0 dBFS. */
export type PeakHoldState = {
  holdDb: number;
  clipped: boolean;
};

export function emptyPeakHold(): PeakHoldState {
  return { holdDb: METER_DB_MIN, clipped: false };
}

/** True when peak exceeds 0.0 dBFS (strict). */
export function isClipPeakDb(db: number): boolean {
  return Number.isFinite(db) && db > 0;
}

/**
 * Advance peak-hold latch with a live analyser reading.
 * Hold never decays; clip latches until {@link emptyPeakHold} / reset.
 */
export function updatePeakHold(
  prev: PeakHoldState,
  liveDb: number,
): PeakHoldState {
  const live = Number.isFinite(liveDb) ? liveDb : METER_DB_MIN;
  const holdDb = Math.max(prev.holdDb, live);
  const clipped = prev.clipped || isClipPeakDb(live);
  if (holdDb === prev.holdDb && clipped === prev.clipped) return prev;
  return { holdDb, clipped };
}

/** Format peak-hold box (`−∞`, `−12.3`, `+0.4`). */
export function formatPeakHoldDb(db: number): string {
  if (!Number.isFinite(db) || db <= METER_DB_MIN) return "−∞";
  const rounded = Math.round(db * 10) / 10;
  if (rounded > 0) return `+${rounded.toFixed(1)}`;
  if (rounded === 0) return "0.0";
  return rounded.toFixed(1);
}
