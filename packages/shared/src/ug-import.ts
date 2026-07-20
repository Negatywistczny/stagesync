/**
 * Ultimate Guitar / ChordPro-lite import → Tekst + Akordy clips (α8).
 *
 * Fail-soft: returns Result — never throws for bad user input.
 * Zod validates clip shapes on the success path.
 */

import { z } from "zod";
import {
  AkordClipSchema,
  TekstClipSchema,
  type AkordClip,
  type TekstClip,
} from "./schema.js";
import { DEFAULT_PPQ, ticksPerBar, type TimeSignature } from "./time.js";

const UgImportPayloadSchema = z.object({
  tekst: z.object({ clips: z.array(TekstClipSchema) }),
  akordy: z.object({ clips: z.array(AkordClipSchema) }),
});

export type UgImportOk = {
  ok: true;
  tekst: { clips: TekstClip[] };
  akordy: { clips: AkordClip[] };
};

export type UgImportErr = {
  ok: false;
  message: string;
};

export type UgImportResult = UgImportOk | UgImportErr;

export type UgImportOptions = {
  ppq?: number;
  meter?: TimeSignature;
  /** Content floor (usually end of Countdown = 0). */
  contentFloorTicks?: number;
  idPrefix?: string;
};

const CHORD_TOKEN =
  /^[A-G](?:#|b)?(?:maj|min|m|sus|dim|aug|add)?[0-9]*(?:\/[A-G](?:#|b)?)?$/i;

function stripBracketChords(line: string): string {
  return line.replace(/\[[^\]]*]/g, "").replace(/\s+/g, " ").trim();
}

function extractBracketChords(line: string): string[] {
  const out: string[] = [];
  const re = /\[([^\]]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    const raw = m[1]!.trim();
    if (raw && CHORD_TOKEN.test(raw)) out.push(raw);
  }
  return out;
}

function isChordOnlyLine(line: string): boolean {
  const tokens = line.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every((t) => CHORD_TOKEN.test(t));
}

function parseChordOnlyLine(line: string): string[] {
  return line.split(/\s+/).filter((t) => CHORD_TOKEN.test(t));
}

/**
 * Parse UG-style / ChordPro-lite text into Tekst + Akordy clips.
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
    const raw = text.replace(/\r\n/g, "\n").trim();
    if (!raw) {
      return { ok: false, message: "Pusty tekst — wklej tabulaturę UG lub ChordPro." };
    }

    // Reject obvious binary / control soup (except tab/newline).
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
    const floor = options.contentFloorTicks ?? 0;
    const prefix = options.idPrefix ?? "ug";

    const tekstClips: TekstClip[] = [];
    const akordClips: AkordClip[] = [];
    let cursor = floor;
    let seq = 0;
    let pendingChords: string[] = [];
    let sawContent = false;

    const lines = raw.split("\n");
    for (const lineRaw of lines) {
      const line = lineRaw.trim();
      if (!line) continue;
      if (line.startsWith("{") && line.endsWith("}")) continue; // ChordPro directives skip
      if (/^\[[^\]]+\]$/.test(line) && !extractBracketChords(line).length) {
        // [Verse] style section markers — skip
        continue;
      }

      const bracketChords = extractBracketChords(line);
      const lyric = stripBracketChords(line);

      if (bracketChords.length && lyric) {
        sawContent = true;
        const chords = [...pendingChords, ...bracketChords];
        pendingChords = [];
        for (const symbol of chords) {
          akordClips.push({
            id: `${prefix}-akord-${++seq}`,
            startTicks: cursor,
            lengthTicks: barTicks,
            symbol,
          });
          cursor += barTicks;
        }
        // Align lyric to first chord of this line span — rewind to line start
        const lineStart = cursor - chords.length * barTicks;
        tekstClips.push({
          id: `${prefix}-tekst-${++seq}`,
          startTicks: lineStart,
          lengthTicks: Math.max(barTicks, chords.length * barTicks),
          text: lyric,
        });
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
        const chords = pendingChords.length ? [...pendingChords] : [];
        pendingChords = [];
        if (chords.length) {
          for (const symbol of chords) {
            akordClips.push({
              id: `${prefix}-akord-${++seq}`,
              startTicks: cursor,
              lengthTicks: barTicks,
              symbol,
            });
            cursor += barTicks;
          }
          const lineStart = cursor - chords.length * barTicks;
          tekstClips.push({
            id: `${prefix}-tekst-${++seq}`,
            startTicks: lineStart,
            lengthTicks: Math.max(barTicks, chords.length * barTicks),
            text: lyric,
          });
        } else {
          tekstClips.push({
            id: `${prefix}-tekst-${++seq}`,
            startTicks: cursor,
            lengthTicks: barTicks,
            text: lyric,
          });
          cursor += barTicks;
        }
      }
    }

    if (pendingChords.length) {
      sawContent = true;
      for (const symbol of pendingChords) {
        akordClips.push({
          id: `${prefix}-akord-${++seq}`,
          startTicks: cursor,
          lengthTicks: barTicks,
          symbol,
        });
        cursor += barTicks;
      }
    }

    if (!sawContent || (tekstClips.length === 0 && akordClips.length === 0)) {
      return {
        ok: false,
        message:
          "Nie rozpoznano akordów ani tekstu — sprawdź format UG / ChordPro.",
      };
    }

    const payload = UgImportPayloadSchema.safeParse({
      tekst: { clips: tekstClips },
      akordy: { clips: akordClips },
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
    };
  } catch {
    return {
      ok: false,
      message: "Nie udało się sparsować tekstu UG.",
    };
  }
}
