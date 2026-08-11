/**
 * Harmonic accent detection for US+UG chord placement (Filar 2).
 *
 * Within a chord’s syllable scope, pick the **first** local score maximum —
 * typically a long sustain before a phrase break — not a short pickup.
 */

export type HarmonicSyllable = {
  text: string;
  startTicks: number;
  endTicks: number;
  durationTicks: number;
  pitchMidi: number;
  /** UltraStar phrase index (line between `-` markers). */
  phraseIndex: number;
};

export type HarmonicAccentScoreContext = {
  /** Previous syllable in the same scope (pitch jump); null if first. */
  prev: HarmonicSyllable | null;
  /** True when this is the last syllable in the scope (before pause / next chord). */
  beforePause: boolean;
  /** 0-based index within the scoped list. */
  indexInScope: number;
  scopeLength: number;
};

/** Weight for note length (primary accent signal). */
const W_DURATION = 1;
/** Extra duration weight when syllable sits at end of scope (phrase / next chord). */
const W_BEFORE_PAUSE_DURATION = 0.5;
/** Weight for absolute pitch jump from previous syllable. */
const W_PITCH_JUMP = 1.5;
/** Penalty for short early pickups (anacrusis). */
const W_EARLY_PICKUP = 18;
/** Fraction of scope treated as “early”; short notes there are penalized. */
const EARLY_FRACTION = 0.4;
/** Duration below this×median is “short” for pickup penalty. */
const SHORT_VS_MEDIAN = 0.55;

/**
 * Deterministic accent score for one syllable in a chord scope.
 * Higher = more likely harmonic downbeat target.
 */
export function scoreHarmonicAccent(
  syl: HarmonicSyllable,
  ctx: HarmonicAccentScoreContext,
): number {
  const dur = Math.max(0, syl.durationTicks);
  let score = W_DURATION * dur;

  // Phrase-final sustain: boost long notes at the boundary, not short tails.
  if (ctx.beforePause) {
    score += W_BEFORE_PAUSE_DURATION * dur;
  }

  if (ctx.prev) {
    score += W_PITCH_JUMP * Math.abs(syl.pitchMidi - ctx.prev.pitchMidi);
  }

  return score;
}

function medianDuration(syllables: readonly HarmonicSyllable[]): number {
  if (syllables.length === 0) return 1;
  const sorted = syllables
    .map((s) => Math.max(0, s.durationTicks))
    .sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

/**
 * Score with relative early-pickup penalty (needs full scope for median).
 */
function scoreInScope(
  syl: HarmonicSyllable,
  ctx: HarmonicAccentScoreContext,
  medianDur: number,
): number {
  let score = scoreHarmonicAccent(syl, ctx);
  const earlyCut = Math.max(1, Math.floor(ctx.scopeLength * EARLY_FRACTION));
  const isEarly = ctx.indexInScope < earlyCut && ctx.scopeLength > 1;
  const isShort = syl.durationTicks < Math.max(1, medianDur * SHORT_VS_MEDIAN);
  if (isEarly && isShort) {
    score -= W_EARLY_PICKUP * Math.max(1, medianDur - syl.durationTicks);
  }
  return score;
}

/**
 * First syllable with maximum accent score in scope.
 * Empty scope → `null` (caller applies S1 interpolation).
 * Tie-break: **earlier** index wins (first local max).
 */
export function findHarmonicAccentSyllable(
  syllablesInScope: readonly HarmonicSyllable[],
): HarmonicSyllable | null {
  if (syllablesInScope.length === 0) return null;

  const medianDur = medianDuration(syllablesInScope);
  let bestIdx = 0;
  let bestScore = -Infinity;

  for (let i = 0; i < syllablesInScope.length; i++) {
    const syl = syllablesInScope[i]!;
    const ctx: HarmonicAccentScoreContext = {
      prev: i > 0 ? syllablesInScope[i - 1]! : null,
      beforePause: i === syllablesInScope.length - 1,
      indexInScope: i,
      scopeLength: syllablesInScope.length,
    };
    const score = scoreInScope(syl, ctx, medianDur);
    // Strict `>` keeps the first index on ties.
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return syllablesInScope[bestIdx]!;
}

/**
 * Syllables whose start falls in `[scopeStart, scopeEnd)`.
 * When `scopeEnd` is null, keep syllables through the end of the phrase that
 * contains `scopeStart` (inclusive of that phrase only).
 */
export function syllablesInChordScope(
  all: readonly HarmonicSyllable[],
  scopeStartTicks: number,
  scopeEndTicks: number | null,
): HarmonicSyllable[] {
  if (scopeEndTicks != null) {
    return all.filter(
      (s) => s.startTicks >= scopeStartTicks && s.startTicks < scopeEndTicks,
    );
  }
  // No next chord: stay inside the US phrase that owns scopeStart.
  const anchor = all.find(
    (s) =>
      s.startTicks >= scopeStartTicks ||
      (s.startTicks <= scopeStartTicks && s.endTicks > scopeStartTicks),
  );
  // Prefer the first syllable at/after scopeStart for phrase id.
  const fromStart = all.find((s) => s.startTicks >= scopeStartTicks);
  const phraseIndex = (fromStart ?? anchor)?.phraseIndex;
  if (phraseIndex == null) return [];
  return all.filter(
    (s) => s.phraseIndex === phraseIndex && s.startTicks >= scopeStartTicks,
  );
}
