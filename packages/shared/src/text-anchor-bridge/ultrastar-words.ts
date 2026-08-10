import type { UltrastarImportOk } from "../ultrastar-import.js";
import type { HarmonicSyllable } from "../harmonic-accent.js";
import type { TimedWord } from "./types.js";
import { normalizeLyricToken, tokenizeLyrics } from "./tokenize.js";

/**
 * Timed words from UltraStar tekst clips (block trailing spaces = word ends).
 */
export function timedWordsFromUltrastar(us: UltrastarImportOk): TimedWord[] {
  const out: TimedWord[] = [];
  for (const clip of us.tekst.clips) {
    const blocks = clip.blocks ?? [];
    if (blocks.length === 0) {
      for (const t of tokenizeLyrics(clip.text)) {
        out.push({
          raw: t.raw,
          norm: t.norm,
          startTicks: clip.startTicks,
          endTicks: clip.startTicks + clip.lengthTicks,
        });
      }
      continue;
    }

    let buf = "";
    let startTicks = blocks[0]!.startTicks;
    let endTicks = startTicks;
    let open = false;

    const flush = () => {
      const raw = buf.trim();
      const norm = normalizeLyricToken(raw);
      if (norm) {
        out.push({ raw, norm, startTicks, endTicks });
      }
      buf = "";
      open = false;
    };

    for (const b of blocks) {
      if (!open) {
        startTicks = b.startTicks;
        open = true;
      }
      endTicks = b.startTicks + b.lengthTicks;
      const endsWord = /\s$/.test(b.text);
      buf += b.text.trimEnd();
      if (endsWord) flush();
    }
    if (open && buf.trim()) flush();
  }
  return out;
}

/**
 * Timed syllables from UltraStar tekst + melody (pitch by matching startTicks).
 */
export function timedSyllablesFromUltrastar(
  us: UltrastarImportOk,
): HarmonicSyllable[] {
  const pitchByStart = new Map<number, number>();
  for (const m of us.melody.clips) {
    pitchByStart.set(m.startTicks, m.pitchMidi);
  }
  const out: HarmonicSyllable[] = [];
  us.tekst.clips.forEach((clip, phraseIndex) => {
    for (const b of clip.blocks ?? []) {
      const raw = b.text.trimEnd();
      if (!raw || !normalizeLyricToken(raw)) continue;
      const durationTicks = Math.max(1, b.lengthTicks);
      out.push({
        text: raw,
        startTicks: b.startTicks,
        endTicks: b.startTicks + durationTicks,
        durationTicks,
        pitchMidi: pitchByStart.get(b.startTicks) ?? 60,
        phraseIndex,
      });
    }
  });
  return out;
}
