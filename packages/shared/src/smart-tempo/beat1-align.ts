import {
  DEFAULT_PPQ,
  ticksPerBar,
  ticksToMs,
  type TimeSignature,
} from "../time-tempo/time.js";
import { YOUTUBE_VIDEO_ID_RE } from "./constants.js";

/**
 * Extract YouTube video id from UltraStar #VIDEO value or bare id.
 * USDB / UltraStar Deluxe CSV: `a=` (audio) and/or `v=` (video), plus `co=` / `bg=`.
 * Prefer `a=` for audio ingest when both are present.
 */
export function extractYoutubeVideoId(raw: string): string | null {
  let trimmed = raw.trim();
  if (!trimmed) return null;
  // Bound before polynomial URL regexes (ReDoS).
  if (trimmed.length > 2048) trimmed = trimmed.slice(0, 2048);
  if (YOUTUBE_VIDEO_ID_RE.test(trimmed)) return trimmed;

  const usdbPrefixed = [
    /(?:^|[,\s])a=([a-zA-Z0-9_-]{11})(?:$|[,#&\s])/i,
    /(?:^|[,\s])v=([a-zA-Z0-9_-]{11})(?:$|[,#&\s])/i,
  ];
  for (const re of usdbPrefixed) {
    const m = re.exec(trimmed);
    if (m?.[1] && YOUTUBE_VIDEO_ID_RE.test(m[1])) return m[1];
  }

  const csvHead = trimmed.split(",")[0]?.trim() ?? "";
  if (csvHead && YOUTUBE_VIDEO_ID_RE.test(csvHead)) return csvHead;

  const patterns = [
    /(?:youtube\.com\/watch\?[^#]{0,512}v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/i,
    /[?&]v=([a-zA-Z0-9_-]{11})/i,
  ];
  for (const re of patterns) {
    const m = re.exec(trimmed);
    if (m?.[1] && YOUTUBE_VIDEO_ID_RE.test(m[1])) return m[1];
  }
  return null;
}

/** Ms spanned by one bar at constant BPM. */
export function msPerBarAtBpm(
  bpm: number,
  meter: TimeSignature = { numerator: 4, denominator: 4 },
  ppq = 480,
): number {
  const barTicks = ticksPerBar(meter, ppq);
  return ticksToMs(barTicks, bpm, meter, ppq);
}

/**
 * Editorial Beat 1 for a long pipe Intro + UltraStar `#GAP`.
 * Places `#GAP` ≈ `pipeBarCount + ½` bars after Beat 1 @ `layoutBpm` so the
 * anacrusis pickup lands in the last Intro bar and Verse Forma @ pipe+1
 * matches the recording (PO layout) — without song-specific constants.
 * Prefers a nearby first transient (±½ bar); otherwise the ideal editorial ms.
 */
export function suggestBeat1MsFromPipeAndGap(opts: {
  gapMs: number;
  pipeBarCount: number;
  layoutBpm: number;
  meter?: TimeSignature;
  ppq?: number;
  transientMs?: number | null;
}): number {
  const gap = Math.max(0, Math.round(opts.gapMs));
  const pipeBars = Math.max(0, Math.trunc(opts.pipeBarCount));
  const bpm = opts.layoutBpm > 0 ? opts.layoutBpm : 120;
  const meter = opts.meter ?? { numerator: 4, denominator: 4 };
  const ppq = opts.ppq ?? DEFAULT_PPQ;
  const transient =
    opts.transientMs != null && Number.isFinite(opts.transientMs)
      ? Math.max(0, Math.round(opts.transientMs))
      : null;

  if (!(gap > 0)) return transient ?? 0;

  if (pipeBars < 12) {
    if (transient == null || transient <= 0 || transient >= gap * 0.85) {
      return gap;
    }
    return transient;
  }

  const barMs = msPerBarAtBpm(bpm, meter, ppq);
  if (!(barMs > 0)) return transient ?? gap;

  const idealBeat1 = Math.max(0, Math.round(gap - (pipeBars + 0.5) * barMs));

  if (transient != null && transient > 0 && transient < gap * 0.85) {
    // Strict half-bar: a full bar late is the −1 vocal drift we must reject.
    if (Math.abs(transient - idealBeat1) < barMs * 0.5) {
      return transient;
    }
  }
  return idealBeat1;
}

/**
 * Snap editorial Beat 1 to the nearest onset within ±¼ beat so the downbeat
 * attack lands on the barline. Earlier snaps trim silence before the attack;
 * later snaps keep pre-roll when the editorial offset sat past the attack
 * (MP3 otherwise leads the grid by a fraction of a beat).
 */
export function snapBeat1MsToOnset(
  beat1Ms: number,
  onsetsMs: readonly number[],
  bpm: number,
): number {
  const beat = Math.max(0, Math.round(beat1Ms));
  if (!(bpm > 0) || onsetsMs.length === 0) return beat;
  const windowMs = (60_000 / bpm) * 0.25;
  let best: number | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const raw of onsetsMs) {
    if (!(raw >= 0) || !Number.isFinite(raw)) continue;
    const o = Math.round(raw);
    const d = Math.abs(o - beat);
    if (d > windowMs) continue;
    // Prefer closer; on ties prefer earlier (attack at/before barline).
    if (d < bestDist || (d === bestDist && (best == null || o < best))) {
      best = o;
      bestDist = d;
    }
  }
  return best ?? beat;
}

/**
 * Nudge Beat 1 so a section's first chord syllable lands near Forma Beat 1
 * (pickup may sit in the previous bar). Corrects small integer-bar drift on
 * long pipe intros — does not snap every lyric to the beat grid.
 *
 * Returns the adjusted `audioStartOffsetMs` (file ms). Decreasing the offset
 * moves vocals/MP3 later on the timeline (more pre-roll kept before trim).
 */
export function alignBeat1ToChordSyllable(opts: {
  audioStartOffsetMs: number;
  /** Wall-clock file ms of the syllable tied to the section's first chord. */
  chordSyllableMs: number;
  formaSectionStartTicks: number;
  pipeBarCount: number;
  seedBpm: number;
  meter?: TimeSignature;
  ppq?: number;
}): number {
  const pipeBars = Math.max(0, Math.trunc(opts.pipeBarCount));
  const offset = Math.max(0, opts.audioStartOffsetMs);
  const chordMs = opts.chordSyllableMs;
  if (!(chordMs > 0) || pipeBars < 12) return offset;
  // Beat 1 at/near GAP: intentional trim of instrumental — do not shove vocals.
  if (offset >= chordMs * 0.85) return offset;

  const meter = opts.meter ?? { numerator: 4, denominator: 4 };
  const ppq = opts.ppq ?? DEFAULT_PPQ;
  const barTicks = ticksPerBar(meter, ppq);
  const barMs = msPerBarAtBpm(opts.seedBpm, meter, ppq);
  if (!(barMs > 0) || barTicks <= 0) return offset;

  const contentMs = Math.max(0, chordMs - offset);
  const observedBars = contentMs / barMs;
  const formaBars = opts.formaSectionStartTicks / barTicks;
  // Pickup center: half a bar before Forma section Beat 1.
  const idealBars = formaBars - 0.5;
  const deltaBars = observedBars - idealBars;
  // Drift Gate style: only correct ~½–2.5 bar structural misalignment.
  if (Math.abs(deltaBars) < 0.5 || Math.abs(deltaBars) > 2.5) return offset;
  const shiftBars = Math.round(deltaBars);
  if (shiftBars === 0) return offset;
  return Math.max(0, Math.round(offset + shiftBars * barMs));
}
