/**
 * Shared numeric constants for offline audio tempo analysis (Smart Tempo).
 */

export const DSP_DIAG = Boolean(import.meta.env?.DEV);
export const FRAME_SIZE = 1024;
export const BASE_HOP_SIZE = 256;
export const ONSET_THRESHOLD = 0.02;
export const MIN_BPM = 60;
export const MAX_BPM = 200;

/** First N seconds scanned for onset / BPM detection (UI path). */
export const DEFAULT_MAX_ANALYSIS_SEC = 120;
/** Hard stop so import never hangs on analysis. */
export const DEFAULT_ANALYSIS_TIMEOUT_MS = 3_500;
export const DEFAULT_DOWNSAMPLE = 6;
/** Yield after this many analysis hops (~130 ms of work at 44.1 kHz / 512 hop). */
export const ONSET_CHUNK_HOPS = 120;
/** Cap onset list so beat-grid refinement stays bounded (full-song import). */
export const MAX_ONSETS = 2048;
/** Cap beat grid when only an analysis window is requested. */
export const MAX_BEATS_WINDOW = 128;
/** Cap beat grid for full-track Smart Tempo (matches shared SMART_TEMPO_MAX_BEATS). */
export const MAX_BEATS_FULL_TRACK = 2048;

/**
 * Cap hop for ACF BPM search. Onset picking may use a coarser hop on long
 * files, but integer-lag ACF must resolve mid-tempo: with hop·downsample that
 * yields ~46 ms/lag, ~123 BPM falls between lag N≈129 and N+1≈117 — parabolic
 * interp cannot invent a ridge that never appears as a local max. Target
 * ≈≤2.5 BPM lag quantum around 120 (≳40 lags per quarter-note period).
 */
export const ACF_MAX_HOP_SIZE = 256;
/** Minimum lags per beat period @ 120 BPM for ACF lag search. */
export const ACF_MIN_LAGS_PER_BEAT = 60;

/** Relative score floor for “competitive” ACF peaks (within ~12% of best). */
export const ACF_COMPARABLE_METRIC_RATIO = 0.88;
/** Soft seed pull applies within ±20% of seed. */
export const ACF_SEED_SOFT_RADIUS = 0.2;
/** Extra metric weight for proximity to seed inside that radius. */
export const ACF_SEED_DIST_WEIGHT = 0.35;
/** Real-peak proximity required before promoting an octave mate. */
export const ACF_OCTAVE_MATE_REL = 0.04;
export const ACF_OCTAVE_MATE_SCORE_SCALE = 0.85;

/** Histogram bin width for pairwise inter-onset periods (ms). */
export const ONSET_PERIOD_HIST_BIN_MS = 10;
/** Min pairwise samples in the peak bin before trusting the histogram. */
export const ONSET_PERIOD_HIST_MIN_COUNT = 3;
/**
 * If consecutive-onset BPM is ≥ this factor × histogram BPM, treat consecutive
 * IBI as subdivision and prefer the histogram period (general octave rule).
 */
export const ONSET_SUBDIVISION_RATIO = 1.6;

/** Relative disagreement vs seed in the same octave before consulting competitors. */
export const RECONCILE_SEED_REL_TOL = 0.015;
/** Competing peak must still be within this relative distance of seed. */
export const RECONCILE_COMPETITOR_SEED_REL = 0.08;
/**
 * Competing peak must also stay near the ACF winner (same musical reading).
 * Blocks weak near-seed ghosts (~112 when ACF≈128) that invent a "compromise".
 */
export const RECONCILE_COMPETITOR_ACF_REL = 0.1;

export const BEAT_ONSET_BLEND = 0.3;
export const BEAT_SNAP_FRAC = 0.08;

/** Running IBI window for period inertia (≈2 bars @ 4/4). */
export const LOCAL_PERIOD_IBI_WINDOW = 8;
/**
 * Soft step vs current local period (gradual rubato only).
 * Tighter 0.94–1.06 band (+/- 6%).
 */
export const LOCAL_PERIOD_STEP_LO = 0.94;
export const LOCAL_PERIOD_STEP_HI = 1.06;
/**
 * Hard gate vs stable quarter-note reference (median IBI + period hint).
 * Rejects half-beat / double-time snaps and 1.5-beat syncopation traps.
 */
export const STABLE_PERIOD_STEP_LO = 0.92;
export const STABLE_PERIOD_STEP_HI = 1.08;
/** Weight of `periodHint` inside `stableRef` (rest = recent median IBI). */
export const PERIOD_HINT_STABLE_WEIGHT = 0.15;
/** Clamp local period vs hint — keeps tracking strictly within quarter-note tempo band (+/- 6%). */
export const PERIOD_HINT_CLAMP_LO = 0.88;
export const PERIOD_HINT_CLAMP_HI = 1.12;

export const TIMEOUT_WARNING =
  "Analiza tempa trwa zbyt długo — użyto domyślnego tempa (120 BPM). Możesz ustawić BPM ręcznie.";

