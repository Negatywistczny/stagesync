/**
 * Ultimate Guitar / ChordPro-lite import — Zod payload + parse / reflow.
 */

import { withWholeLineTekstBlocks } from "../../project/project-seed.js";
import { cleanUgTabContent } from "./ug-content.js";
import type { AkordClip, FormaClip, TekstClip } from "../../project/schema.js";
import { DEFAULT_PPQ, ticksPerBar } from "../../time-tempo/time.js";
import { UgImportPayloadSchema } from "./payload.js";
import {
  chordOnsetsInBar,
  clipsFromOnsets,
  dedupeConsecutive,
  extractBracketChords,
  isChordOnlyLine,
  parseChordOnlyLine,
  sealAkordyLengths,
  stripBracketChords,
} from "./chords.js";
import { defaultSectionName, splitUgSections } from "./sections.js";
import type {
  UgImportOptions,
  UgImportResult,
  UgSectionPreview,
} from "./types.js";

/**
 * Parse UG-style / ChordPro-lite text into Forma + Tekst + Akordy.
 * Empty / garbage → `{ ok: false, message }` (Polish).
 */
export function importUgText(
  text: string,
  options: UgImportOptions = {},
): UgImportResult {
  try {
    if (typeof text !== "string") {
      return { ok: false, message: "Nieprawidłowy tekst UG." };
    }
    const raw = cleanUgTabContent(text.replace(/\r\n/g, "\n"));
    if (!raw) {
      return {
        ok: false,
        message: "Pusty tekst — pobierz z UG, wklej link albo ChordPro.",
      };
    }
    if (raw.length > 524_288) {
      return {
        ok: false,
        message: "Tekst importu jest za długi (max 512 KB).",
      };
    }

    // eslint-disable-next-line no-control-regex -- intentional binary sniff
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(raw)) {
      return {
        ok: false,
        message: "Tekst zawiera niedozwolone znaki sterujące.",
      };
    }

    const ppq = options.ppq ?? DEFAULT_PPQ;
    const meter = options.meter ?? { numerator: 4, denominator: 4 };
    const barTicks = ticksPerBar(meter, ppq);
    const beatsPerBar = Math.max(1, meter.numerator);
    const ticksPerBeat = Math.max(1, Math.floor(barTicks / beatsPerBar));
    const barsPerLine = Math.max(1, Math.trunc(options.barsPerLine ?? 1));
    const lineTicks = barTicks * barsPerLine;
    const floor = options.contentFloorTicks ?? 0;
    const prefix = options.idPrefix ?? "ug";

    const buckets = splitUgSections(raw);
    if (buckets.length === 0) {
      return {
        ok: false,
        message:
          "Nie rozpoznano akordów ani tekstu — sprawdź format UG / ChordPro.",
      };
    }

    const tekstClips: TekstClip[] = [];
    const akordClips: AkordClip[] = [];
    const formaClips: FormaClip[] = [];
    const sectionPreview: UgSectionPreview[] = [];
    let cursor = floor;
    let seq = 0;
    let sawContent = false;

    for (let si = 0; si < buckets.length; si++) {
      const bucket = buckets[si]!;
      const sectionName = defaultSectionName(si, bucket.name);
      const sectionStart = cursor;
      let pendingChords: string[] = [];
      let lyricLines = 0;
      let chordCount = 0;

      const flushChordsAtCursor = (
        symbols: string[],
        sourceLineId?: string,
      ) => {
        const list = dedupeConsecutive(symbols);
        if (!list.length) return;
        chordCount += list.length;
        const spanStart = cursor;
        const spanEnd = cursor + lineTicks;
        const onsets = chordOnsetsInBar(
          list.length,
          spanStart,
          barTicks,
          beatsPerBar,
          ticksPerBeat,
        );
        const placed = clipsFromOnsets(
          list,
          onsets,
          spanEnd,
          prefix,
          seq,
          sourceLineId,
        );
        seq = placed.nextSeq;
        akordClips.push(...placed.clips);
        cursor = spanEnd;
      };

      for (const line of bucket.lines) {
        const bracketChords = extractBracketChords(line);
        const lyric = stripBracketChords(line);

        if (bracketChords.length && lyric) {
          sawContent = true;
          lyricLines += 1;
          const chords = dedupeConsecutive([
            ...pendingChords,
            ...bracketChords,
          ]);
          pendingChords = [];
          const lineStart = cursor;
          const tekstId = `${prefix}-tekst-${++seq}`;
          if (chords.length) {
            flushChordsAtCursor(chords, tekstId);
          } else {
            cursor += lineTicks;
          }
          tekstClips.push(
            withWholeLineTekstBlocks({
              id: tekstId,
              startTicks: lineStart,
              lengthTicks: lineTicks,
              text: lyric,
              sourceSection: sectionName,
            }),
          );
          continue;
        }

        if (bracketChords.length && !lyric) {
          pendingChords.push(...bracketChords);
          continue;
        }

        if (isChordOnlyLine(line)) {
          pendingChords.push(...parseChordOnlyLine(line));
          continue;
        }

        if (lyric) {
          sawContent = true;
          lyricLines += 1;
          const chords = pendingChords.length
            ? dedupeConsecutive(pendingChords)
            : [];
          pendingChords = [];
          const lineStart = cursor;
          const tekstId = `${prefix}-tekst-${++seq}`;
          if (chords.length) {
            flushChordsAtCursor(chords, tekstId);
          } else {
            cursor += lineTicks;
          }
          tekstClips.push(
            withWholeLineTekstBlocks({
              id: tekstId,
              startTicks: lineStart,
              lengthTicks: lineTicks,
              text: lyric,
              sourceSection: sectionName,
            }),
          );
        }
      }

      if (pendingChords.length) {
        sawContent = true;
        flushChordsAtCursor(pendingChords);
        pendingChords = [];
      }

      if (cursor <= sectionStart) {
        continue;
      }
      formaClips.push({
        id: `${prefix}-forma-${si + 1}`,
        name: sectionName,
        startTicks: sectionStart,
        lengthTicks: Math.max(1, cursor - sectionStart),
        kind: "section",
      });
      sectionPreview.push({
        name: sectionName,
        lyricLines,
        chordCount,
        estimatedBars: Math.max(
          1,
          Math.round((cursor - sectionStart) / barTicks),
        ),
      });
    }

    if (!sawContent || (tekstClips.length === 0 && akordClips.length === 0)) {
      return {
        ok: false,
        message:
          "Nie rozpoznano akordów ani tekstu — sprawdź format UG / ChordPro.",
      };
    }

    if (formaClips.length === 0) {
      return {
        ok: false,
        message: "Nie udało się zbudować sekcji Formy z importu UG.",
      };
    }

    const sealed = sealAkordyLengths(akordClips);

    const payload = UgImportPayloadSchema.safeParse({
      tekst: { clips: tekstClips },
      akordy: { clips: sealed },
      formaMusic: { clips: formaClips },
    });
    if (!payload.success) {
      return {
        ok: false,
        message: "Sparsowany UG nie przeszedł walidacji schematu.",
      };
    }

    return {
      ok: true,
      tekst: payload.data.tekst,
      akordy: payload.data.akordy,
      formaMusic: payload.data.formaMusic,
      sections: sectionPreview,
      barsPerLine,
    };
  } catch {
    return {
      ok: false,
      message: "Nie udało się sparsować tekstu UG.",
    };
  }
}
