/**
 * UltraStar / USDX import → Tekst blocks (ticks) + melody notes (V6).
 *
 * Timing (ING-06 / ADR 0002):
 * - `#BPM` is UltraStar’s ×4 value; metronome BPM = header / 4.
 * - One UltraStar beat = one sixteenth (header BPM units).
 * - `#GAP` is ms from audio start to US beat 0 → ticks on the edge.
 * - Storage is integer ticks only (never ms).
 *
 * Fail-soft: returns Result — never throws for bad user input.
 */

import {
  MelodyNoteClipSchema,
  TekstClipSchema,
  type MelodyNoteClip,
  type Project,
  type TekstBlock,
  type TekstBlockRole,
  type TekstClip,
} from "./schema.js";
import { DEFAULT_PPQ, elapsedToTicks, type TimeSignature } from "./time.js";

export type UltrastarImportOk = {
  ok: true;
  title: string | null;
  artist: string | null;
  /** Metronome BPM (= header #BPM / 4). */
  metronomeBpm: number;
  /** Raw UltraStar #BPM (×4). */
  ultrastarBpm: number;
  gapMs: number;
  tekst: { clips: TekstClip[] };
  melody: { clips: MelodyNoteClip[] };
  noteCount: number;
  syllableCount: number;
};

export type UltrastarImportErr = {
  ok: false;
  message: string;
};

export type UltrastarImportResult = UltrastarImportOk | UltrastarImportErr;

export type UltrastarImportOptions = {
  ppq?: number;
  meter?: TimeSignature;
  /** Content floor (usually 0). */
  contentFloorTicks?: number;
  idPrefix?: string;
};

type NoteKind = "regular" | "golden" | "rap" | "goldenRap" | "freestyle";

type RawNote = {
  kind: NoteKind;
  startBeat: number;
  lengthBeat: number;
  pitch: number;
  text: string;
  role?: TekstBlockRole;
};

const NOTE_KIND: Record<string, NoteKind> = {
  ":": "regular",
  "*": "golden",
  R: "rap",
  G: "goldenRap",
  F: "freestyle",
};

function parseHeaderValue(line: string): { key: string; value: string } | null {
  const trimmed = line.trim();
  // `#P1` / `#P2` (no colon) — duet player switch
  const playerOnly = /^#(P[12])$/i.exec(trimmed);
  if (playerOnly) {
    return { key: (playerOnly[1] ?? "").toUpperCase(), value: "" };
  }
  const m = /^#([A-Za-z0-9]+):(.*)$/.exec(trimmed);
  if (!m) return null;
  return { key: (m[1] ?? "").toUpperCase(), value: (m[2] ?? "").trim() };
}

function playerToRole(player: number | null): TekstBlockRole | undefined {
  if (player === 1) return "vocal_1";
  if (player === 2) return "vocal_2";
  return undefined;
}

/**
 * Metronome (quarter) BPM from UltraStar `#BPM` header (×4).
 */
export function ultrastarHeaderBpmToMetronome(headerBpm: number): number {
  if (!Number.isFinite(headerBpm) || headerBpm <= 0) {
    throw new RangeError("UltraStar #BPM must be finite > 0");
  }
  return headerBpm / 4;
}

/**
 * Ticks spanned by one UltraStar beat (sixteenth at project PPQ).
 */
export function ticksPerUltrastarBeat(ppq: number = DEFAULT_PPQ): number {
  return ppq / 4;
}

export function ultrastarBeatToTicks(
  beat: number,
  gapTicks: number,
  ppq: number = DEFAULT_PPQ,
): number {
  return gapTicks + Math.round(beat * ticksPerUltrastarBeat(ppq));
}

/**
 * Parse UltraStar / USDX text into V6 tekst clips (syllable blocks) + melody.
 */
export function importUltrastarText(
  raw: string,
  options: UltrastarImportOptions = {},
): UltrastarImportResult {
  const text = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
  if (!text) {
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

  const notes: RawNote[] = [];
  /** Phrases: arrays of note indices; `-` starts a new phrase. */
  const phrases: number[][] = [[]];

  const lines = text.split("\n");
  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    if (!line) continue;

    const header = parseHeaderValue(line);
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

    if (/^P\s*1$/i.test(line)) {
      player = 1;
      continue;
    }
    if (/^P\s*2$/i.test(line)) {
      player = 2;
      continue;
    }

    if (line === "E" || line.startsWith("E ")) break;

    if (line === "-" || line.startsWith("- ")) {
      const last = phrases[phrases.length - 1];
      if (last && last.length > 0) phrases.push([]);
      continue;
    }

    const kind = NOTE_KIND[line[0] ?? ""];
    if (!kind) continue;

    const rest = line.slice(1).trim();
    const parts = rest.split(/\s+/);
    if (parts.length < 3) {
      return {
        ok: false,
        message: `Niepełna nuta UltraStar: ${line.slice(0, 40)}`,
      };
    }
    const startBeat = Number(parts[0]!.replace(",", "."));
    const lengthBeat = Number(parts[1]!.replace(",", "."));
    const pitch = Number(parts[2]!.replace(",", "."));
    const lyric = parts.slice(3).join(" ");
    if (
      !Number.isFinite(startBeat) ||
      !Number.isFinite(lengthBeat) ||
      lengthBeat <= 0 ||
      !Number.isFinite(pitch)
    ) {
      return {
        ok: false,
        message: `Nieprawidłowa nuta UltraStar: ${line.slice(0, 40)}`,
      };
    }

    const idx = notes.length;
    notes.push({
      kind,
      startBeat,
      lengthBeat,
      pitch,
      text: lyric,
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

  const metronomeBpm = ultrastarHeaderBpmToMetronome(headerBpm);
  let gapTicks: number;
  try {
    gapTicks = elapsedToTicks(gapMs, metronomeBpm, meter, ppq);
  } catch {
    return { ok: false, message: "Nie można przeliczyć #GAP na ticki." };
  }

  const melody: MelodyNoteClip[] = [];
  const tekstClips: TekstClip[] = [];
  let syllableCount = 0;
  let clipSeq = 0;

  for (const phraseIdxs of phrases) {
    if (phraseIdxs.length === 0) continue;

    const phraseNotes = phraseIdxs.map((i) => notes[i]!);
    const blocks: TekstBlock[] = [];
    let blockSeq = 0;

    for (const n of phraseNotes) {
      const startTicks =
        ultrastarBeatToTicks(n.startBeat, gapTicks, ppq) + floor;
      const endTicks =
        ultrastarBeatToTicks(n.startBeat + n.lengthBeat, gapTicks, ppq) + floor;
      const lengthTicks = Math.max(1, endTicks - startTicks);
      const pitchMidi = Math.min(127, Math.max(0, Math.round(n.pitch) + 60));

      melody.push({
        id: `${prefix}-mel-${melody.length + 1}`,
        startTicks,
        lengthTicks,
        pitchMidi,
      });

      const syl = n.text;
      if (syl.length === 0) continue;

      syllableCount += 1;
      const block: TekstBlock = {
        id: `${prefix}-clip-${clipSeq + 1}-block-${blockSeq++}`,
        startTicks,
        lengthTicks,
        text: syl,
      };
      if (n.role) block.role = n.role;
      blocks.push(block);
    }

    if (blocks.length === 0) continue;

    const clipStart = blocks[0]!.startTicks;
    const last = blocks[blocks.length - 1]!;
    const clipEnd = last.startTicks + last.lengthTicks;
    const lineText = blocks.map((b) => b.text).join("");

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
    metronomeBpm,
    ultrastarBpm: headerBpm,
    gapMs,
    tekst: payload.tekst,
    melody: payload.melody,
    noteCount: notes.length,
    syllableCount,
  };
}

export type ApplyUltrastarOptions = {
  /** When true (default), set project.defaultBpm from metronome BPM. */
  applyBpm?: boolean;
};

/**
 * Replace tekst + melody lanes; keep forma / akordy / audio / cue.
 */
export function applyUltrastarImportToProject(
  project: Project,
  imported: UltrastarImportOk,
  options: ApplyUltrastarOptions = {},
): Project {
  const applyBpm = options.applyBpm !== false;
  return {
    ...project,
    ...(applyBpm
      ? {
          defaultBpm: imported.metronomeBpm,
          tempoMap:
            project.tempoMap.length === 0
              ? [
                  {
                    id: "us-tempo-0",
                    startTicks: 0,
                    bpm: imported.metronomeBpm,
                  },
                ]
              : project.tempoMap,
        }
      : {}),
    ...(imported.title?.trim()
      ? { name: imported.title.trim().slice(0, 200) }
      : {}),
    ...(imported.artist?.trim()
      ? { artist: imported.artist.trim().slice(0, 200) }
      : {}),
    tekst: imported.tekst,
    melody: imported.melody,
  };
}
