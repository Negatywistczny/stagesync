/**
 * UltraStar / USDX import — parse text into Tekst + melody clips.
 */

import {
  MelodyNoteClipSchema,
  TekstClipSchema,
  type MelodyNoteClip,
  type TekstBlock,
  type TekstClip,
} from "../../project/schema.js";
import { secondsToTicks } from "../../time-tempo/tempo-map.js";
import { extractYoutubeVideoId } from "../../smart-tempo/smart-tempo.js";
import { DEFAULT_PPQ } from "../../time-tempo/time.js";
import {
  groupUltrastarSyllablesIntoWords,
  ultrastarLineTextFromRawLyrics,
  ultrastarLyricEndsWord,
  ultrastarLyricStartsWord,
  ultrastarSyllableDisplayText,
} from "./lyrics.js";
import {
  NOTE_KIND,
  parseHeaderValue,
  parseUltrastarNoteLine,
  playerToRole,
} from "./parse-note.js";
import { ultrastarBeatToMs, ultrastarHeaderBpmToMetronome } from "./timing.js";
import type {
  RawNote,
  UltrastarImportOptions,
  UltrastarImportResult,
} from "./types.js";

export function importUltrastarText(
  raw: string,
  options: UltrastarImportOptions = {},
): UltrastarImportResult {
  const text = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  if (!text.trim()) {
    return { ok: false, message: "Pusty tekst UltraStar." };
  }

  const ppq = options.ppq ?? DEFAULT_PPQ;
  const meter = options.meter ?? { numerator: 4, denominator: 4 };
  const floor = options.contentFloorTicks ?? 0;
  const prefix = options.idPrefix ?? "us";

  let title: string | null = null;
  let artist: string | null = null;
  let headerBpm: number | null = null;
  let gapMs = 0;
  let player: number | null = null;
  let mp3Hint: string | null = null;
  let videoUrl: string | null = null;

  const notes: RawNote[] = [];
  /** Phrases: arrays of note indices; `-` starts a new phrase. */
  const phrases: number[][] = [[]];

  const lines = text.split("\n");
  for (const lineRaw of lines) {
    // Keep trailing spaces on note lyrics — only strip CR.
    const line = lineRaw.replace(/\r$/, "");
    const trimmed = line.trim();
    if (!trimmed) continue;

    const header = parseHeaderValue(trimmed);
    if (header) {
      switch (header.key) {
        case "TITLE":
          title = header.value || null;
          break;
        case "ARTIST":
          artist = header.value || null;
          break;
        case "BPM": {
          const n = Number(header.value.replace(",", "."));
          if (!Number.isFinite(n) || n <= 0) {
            return { ok: false, message: "Nieprawidłowy #BPM w UltraStar." };
          }
          headerBpm = n;
          break;
        }
        case "GAP": {
          const n = Number(header.value.replace(",", "."));
          if (!Number.isFinite(n) || n < 0) {
            return { ok: false, message: "Nieprawidłowy #GAP w UltraStar." };
          }
          gapMs = n;
          break;
        }
        case "MP3":
          mp3Hint = header.value.trim() || null;
          break;
        case "VIDEO":
          videoUrl = header.value.trim() || null;
          break;
        case "P":
        case "P1":
          player = 1;
          break;
        case "P2":
          player = 2;
          break;
        default:
          break;
      }
      continue;
    }

    if (/^P\s*1$/i.test(trimmed)) {
      player = 1;
      continue;
    }
    if (/^P\s*2$/i.test(trimmed)) {
      player = 2;
      continue;
    }

    if (trimmed === "E" || trimmed.startsWith("E ")) break;

    if (trimmed === "-" || trimmed.startsWith("- ")) {
      const last = phrases[phrases.length - 1];
      if (last && last.length > 0) phrases.push([]);
      continue;
    }

    const parsed = parseUltrastarNoteLine(line);
    if (!parsed) {
      if (NOTE_KIND[trimmed[0] ?? ""]) {
        return {
          ok: false,
          message: `Nieprawidłowa nuta UltraStar: ${trimmed.slice(0, 40)}`,
        };
      }
      continue;
    }

    const idx = notes.length;
    notes.push({
      ...parsed,
      role: playerToRole(player),
    });
    const phrase = phrases[phrases.length - 1];
    if (phrase) phrase.push(idx);
  }

  if (headerBpm == null) {
    return { ok: false, message: "Brak nagłówka #BPM w UltraStar." };
  }
  if (notes.length === 0) {
    return { ok: false, message: "Brak nut w pliku UltraStar." };
  }

  const ultrastarMetronomeBpm = ultrastarHeaderBpmToMetronome(headerBpm);
  const placeBpm =
    options.gridBpm != null &&
    Number.isFinite(options.gridBpm) &&
    options.gridBpm > 0
      ? options.gridBpm
      : ultrastarMetronomeBpm;

  const firstVocalMs = ultrastarBeatToMs(notes[0]!.startBeat, gapMs, headerBpm);
  const youtubeVideoId = videoUrl ? extractYoutubeVideoId(videoUrl) : null;

  const placeTempoMap = [{ startTicks: 0, bpm: placeBpm }];
  const msToTicksSafe = (ms: number): number | null => {
    try {
      return secondsToTicks(ms / 1000, placeTempoMap, placeBpm, meter, ppq);
    } catch {
      return null;
    }
  };

  const melody: MelodyNoteClip[] = [];
  const tekstClips: TekstClip[] = [];
  let syllableCount = 0;
  let wordCount = 0;
  let clipSeq = 0;

  for (const phraseIdxs of phrases) {
    if (phraseIdxs.length === 0) continue;

    const phraseNotes = phraseIdxs.map((i) => notes[i]!);
    const words = groupUltrastarSyllablesIntoWords(phraseNotes);
    wordCount += words.length;

    const blocks: TekstBlock[] = [];
    let blockSeq = 0;

    for (const n of phraseNotes) {
      const startMs = ultrastarBeatToMs(n.startBeat, gapMs, headerBpm);
      const endMs = ultrastarBeatToMs(
        n.startBeat + n.lengthBeat,
        gapMs,
        headerBpm,
      );
      const startRaw = msToTicksSafe(startMs);
      const endRaw = msToTicksSafe(endMs);
      if (startRaw == null || endRaw == null) {
        return {
          ok: false,
          message: "Nie można przeliczyć nut UltraStar na ticki.",
        };
      }
      const startTicks = startRaw + floor;
      const endTicks = endRaw + floor;
      const lengthTicks = Math.max(1, endTicks - startTicks);
      const pitchMidi = Math.min(127, Math.max(0, Math.round(n.pitch) + 60));

      melody.push({
        id: `${prefix}-mel-${melody.length + 1}`,
        startTicks,
        lengthTicks,
        pitchMidi,
      });

      const sylText = ultrastarSyllableDisplayText(n.text);
      const endsWord = ultrastarLyricEndsWord(n.text);
      const startsWord = ultrastarLyricStartsWord(n.text);

      // Leading space = new word: close previous block with a trailing space.
      if (startsWord && blocks.length > 0) {
        const prev = blocks[blocks.length - 1]!;
        if (!/\s$/.test(prev.text)) {
          blocks[blocks.length - 1] = { ...prev, text: `${prev.text} ` };
        }
      }

      if (sylText.length === 0) {
        // Lone `~ ` / space marker — attach word gap to the previous syllable.
        if (endsWord && blocks.length > 0) {
          const prev = blocks[blocks.length - 1]!;
          if (!/\s$/.test(prev.text)) {
            blocks[blocks.length - 1] = { ...prev, text: `${prev.text} ` };
          }
        }
        continue;
      }

      syllableCount += 1;
      const block: TekstBlock = {
        id: `${prefix}-clip-${clipSeq + 1}-block-${blockSeq++}`,
        startTicks,
        lengthTicks,
        // Keep trailing space on word-ending syllables so Client spans do not glue.
        text: endsWord ? `${sylText} ` : sylText,
      };
      if (n.role) block.role = n.role;
      blocks.push(block);
    }

    if (blocks.length === 0) continue;

    const clipStart = blocks[0]!.startTicks;
    const last = blocks[blocks.length - 1]!;
    const clipEnd = last.startTicks + last.lengthTicks;
    const lineText = ultrastarLineTextFromRawLyrics(
      phraseNotes.map((n) => n.text),
    );

    tekstClips.push({
      id: `${prefix}-tekst-${++clipSeq}`,
      startTicks: clipStart,
      lengthTicks: Math.max(1, clipEnd - clipStart),
      text: lineText.slice(0, 2000),
      blocks,
    });
  }

  if (tekstClips.length === 0) {
    return {
      ok: false,
      message: "UltraStar nie zawiera sylab tekstowych (same nuty bez lyrics).",
    };
  }

  const payload = {
    tekst: { clips: tekstClips },
    melody: { clips: melody },
  };

  try {
    for (const c of payload.tekst.clips) TekstClipSchema.parse(c);
    for (const m of payload.melody.clips) MelodyNoteClipSchema.parse(m);
  } catch {
    return {
      ok: false,
      message: "Wynik importu UltraStar nie przeszedł walidacji schematu.",
    };
  }

  return {
    ok: true,
    title,
    artist,
    metronomeBpm: placeBpm,
    ultrastarBpm: headerBpm,
    ultrastarMetronomeBpm,
    gapMs,
    firstVocalMs,
    mp3Hint,
    videoUrl,
    youtubeVideoId,
    tekst: payload.tekst,
    melody: payload.melody,
    noteCount: notes.length,
    syllableCount,
    wordCount,
  };
}
