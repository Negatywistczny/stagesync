/**
 * Text-Anchor Bridging — Różdżka 2.0 + Smart Tempo (audio SSOT):
 *
 * **With audio analysis (Smart Tempo):**
 * 1. **TempoMap** — ONLY from precomputed audio beat grid (`runAudioDrivenSmartTempo`).
 *    UltraStar `#BPM` is decode-only (beat→ms); it must NOT seed tempo, Forma, or layout.
 * 2. **Vocals / melody** — exact UltraStar wall-clock ms → content-epoch TempoMap
 *    (no beat-grid snap — lyrics stay in sync with MP3 as authored in US).
 * 3. **Forma** — walls from UG↔US word links (`layoutFormaFromAlignedWords`);
 *    pipe bar counts only for wordless / instrumental sections (audio seed grid).
 * 4. **Chords** — on aligned US word times (ms→ticks); grid fill only without a word.
 *
 * **Without audio (experimental legacy):**
 * Sparse map from {@link runMultiPassTempoSolver} — orientational US timing, marked approximate.
 *
 * Storage stays integer ticks only (ADR 0002). Fail-soft Result — never throws
 * for ordinary user input.
 */
/** Below this align ratio, import is still allowed but marked approximate. */
export const TEXT_ANCHOR_WEAK_ALIGN = 0.55;

/** Default bars per UG chord change when **filling** a Forma container (not length SSOT). */
export const DEFAULT_BARS_PER_CHORD = 2;

/** Default bars per lyric line when section has no US walls and no pipe. */
export const DEFAULT_BARS_PER_LINE = 1;

export const CHORD_TOKEN =
  /^[A-H](?:#|b)?(?:maj|min|m|sus|dim|aug|add|alt)?[0-9]*(?:sus[0-9]*)?(?:\/[24])?(?:(?:#|b)(?:5|9|11|13))*(?:\([^)]{0,32}\))?(?:\/[A-H](?:#|b)?)?$/i;

/** Reject pathological tokens before CHORD_TOKEN (ReDoS bound). */
export const CHORD_TOKEN_MAX = 64;
