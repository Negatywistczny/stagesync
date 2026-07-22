/**
 * Countdown digit labels — display-only (not persisted as Tekst/Akordy clips).
 * Storage holds Forma Countdown length; Client synthesizes "2"…"1" at render.
 */

import { resolveMeterAt } from "./project-resolve.js";
import { ticksPerBar } from "./time.js";
import type { AkordClip, Project, TekstClip } from "./schema.js";

/** Legacy persisted digit ids (`vl-cd-2`, `vl-cd-1`, …) — scrubbed on migrate / CD resize. */
export function isCountdownDigitClipId(id: string): boolean {
  return /^vl-cd-/i.test(id);
}

export type CountdownDigitLabel = {
  /** 0-based bar index from Countdown start. */
  barOffset: number;
  label: string;
};

/**
 * One digit per bar, counting down from the left (bars=2 → "2","1").
 * Pure — no ticks; callers map via CD `startTicks` + `barTicks`.
 */
export function countdownDigitLabels(bars: number): CountdownDigitLabel[] {
  const total = Math.max(0, Math.trunc(bars));
  const n = Math.min(32, total);
  const out: CountdownDigitLabel[] = [];
  for (let i = 0; i < n; i++) {
    out.push({ barOffset: i, label: String(total - i) });
  }
  return out;
}

function isDigitSymbol(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

/**
 * Ephemeral Tekst clips for Client karaoke (not written to project.json).
 * Ids reuse `vl-cd-*` only as display keys.
 */
export function syntheticCountdownTekstClips(
  startTicks: number,
  bars: number,
  barTicks: number,
): TekstClip[] {
  const bar = Math.max(1, Math.trunc(barTicks));
  const start = Math.trunc(startTicks);
  return countdownDigitLabels(bars).map(({ barOffset, label }) => ({
    id: `vl-cd-${label}`,
    text: label,
    startTicks: start + barOffset * bar,
    lengthTicks: bar,
  }));
}

/** Ephemeral Akordy clips for Client grid during Countdown. */
export function syntheticCountdownAkordClips(
  startTicks: number,
  bars: number,
  barTicks: number,
): AkordClip[] {
  const bar = Math.max(1, Math.trunc(barTicks));
  const start = Math.trunc(startTicks);
  return countdownDigitLabels(bars).map(({ barOffset, label }) => ({
    id: `cd-chord-${label}`,
    symbol: label,
    startTicks: start + barOffset * bar,
    lengthTicks: bar,
  }));
}

/** Resolve CD span → synthetic digit clips (empty when no Countdown). */
export function syntheticCountdownDisplayFromProject(project: Project): {
  tekst: TekstClip[];
  akordy: AkordClip[];
} {
  const cd = project.forma.clips.find((c) => c.kind === "countdown");
  if (!cd) return { tekst: [], akordy: [] };
  const meter = resolveMeterAt(project, Math.max(0, cd.startTicks + cd.lengthTicks));
  const barTicks = ticksPerBar(meter, project.ppq);
  const bars = Math.max(1, Math.round(cd.lengthTicks / barTicks));
  return {
    tekst: syntheticCountdownTekstClips(cd.startTicks, bars, barTicks),
    akordy: syntheticCountdownAkordClips(cd.startTicks, bars, barTicks),
  };
}

/**
 * Drop persisted countdown digits and clear onsets inside the CD span.
 * Does **not** write digit clips — digits are render-time only.
 * Call after migrate / `setCountdownBars` so spilled `vl-cd-*` never stick.
 */
export function scrubCountdownDigitClips(project: Project): Project {
  const cd = project.forma.clips.find((c) => c.kind === "countdown");
  const start = cd?.startTicks;
  const end = cd != null ? cd.startTicks + cd.lengthTicks : null;
  const inCd = (t: number) =>
    start != null && end != null && t >= start && t < end;

  const keepTekst = project.tekst.clips.filter(
    (c) =>
      !isCountdownDigitClipId(c.id) &&
      !inCd(c.startTicks) &&
      !(c.startTicks < 0 && isDigitSymbol(c.text)),
  );
  const keepAkordy = project.akordy.clips.filter(
    (c) =>
      !inCd(c.startTicks) &&
      !(c.startTicks < 0 && isDigitSymbol(c.symbol)),
  );
  const keepCue = project.cue.clips.filter((c) => !inCd(c.startTicks));

  if (
    keepTekst.length === project.tekst.clips.length &&
    keepAkordy.length === project.akordy.clips.length &&
    keepCue.length === project.cue.clips.length
  ) {
    return project;
  }

  return {
    ...project,
    tekst: { clips: keepTekst },
    akordy: { clips: keepAkordy },
    cue: { clips: keepCue },
  };
}

/**
 * @deprecated Prefer `scrubCountdownDigitClips` — no longer regenerates
 * persistent digit clips (PO: digits are Client display overlays).
 */
export function regenerateCountdownContent(project: Project): Project {
  return scrubCountdownDigitClips(project);
}

/** @deprecated Use `syntheticCountdownTekstClips` / `countdownDigitLabels`. */
export function buildCountdownDigitTekstClips(
  startTicks: number,
  lengthTicks: number,
  barTicks: number,
): TekstClip[] {
  const bar = Math.max(1, Math.trunc(barTicks));
  const len = Math.max(bar, Math.trunc(lengthTicks));
  const bars = Math.max(1, Math.round(len / bar));
  return syntheticCountdownTekstClips(startTicks, bars, bar);
}
