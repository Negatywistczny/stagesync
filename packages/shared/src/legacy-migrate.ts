/**
 * Legacy 4.x song / database.json → Project v5 (α9 migrator).
 *
 * Pure ACL: float `startAbs` → ticks via `absBeatToTicks` + axis shift
 * (countdown positive in 4.x → pre-roll ≤ 0 in v5). [ADR 0002] [ADR 0005]
 */

import {
  absBeatToTicks,
  DEFAULT_PPQ,
  ticksPerBar,
  type TimeSignature,
} from "./time.js";
import { ProjectSchema, normalizeKeyTonic, type Project, type FormaClip } from "./schema.js";
import { sealAkordyLengths } from "./ug-import.js";
import { scrubCountdownDigitClips } from "./countdown-content.js";
import {
  ensureFormaSubsections,
  normalizeSubsectionOffsets,
} from "./forma-subsections.js";

export type LegacySection = {
  id?: unknown;
  name?: unknown;
  startAbs?: unknown;
  lengthBeats?: unknown;
  drumsNote?: unknown;
  /** Absolute-beat subsection starts (`{ startAbs }` or bare number). */
  subsections?: unknown;
};

export type LegacySong = {
  id?: unknown;
  title?: unknown;
  name?: unknown;
  tempo?: unknown;
  key?: { tonic?: unknown; mode?: unknown };
  artist?: unknown;
  genre?: unknown;
  midiProgramId?: unknown;
  isTemplate?: unknown;
  markers?: Array<{ id?: unknown; kind?: unknown; startAbs?: unknown }>;
  sections?: LegacySection[];
  vocal?: { lines?: Array<{ id?: unknown; text?: unknown; startAbs?: unknown; rest?: unknown }> };
  chords?: {
    timeSignature?: unknown;
    clips?: Array<{
      id?: unknown;
      chord?: unknown;
      startAbs?: unknown;
      lengthBeats?: unknown;
    }>;
  };
  cues?: Array<{
    id?: unknown;
    startAbs?: unknown;
    text?: unknown;
    lengthBeats?: unknown;
  }>;
  tempoMap?: Array<{ id?: unknown; startAbs?: unknown; bpm?: unknown }>;
  meterMap?: Array<{ id?: unknown; startAbs?: unknown; meter?: unknown }>;
  keyMap?: Array<{
    id?: unknown;
    startAbs?: unknown;
    key?: { tonic?: unknown; mode?: unknown };
  }>;
  scoreBarMap?: {
    anchors?: Array<{
      id?: unknown;
      logicBar?: unknown;
      songBar?: unknown;
      transportBar?: unknown;
      scoreBar?: unknown;
    }>;
  };
};

export type LegacyDatabase = {
  schemaVersion?: unknown;
  songs?: LegacySong[];
  setlist?: { enabled?: unknown; songIds?: unknown[] };
  settings?: { setlistAutoAdvance?: unknown };
};

export type MigrateLegacySongOptions = {
  /** Override output project id (else derived / required). */
  projectId: string;
  updatedAt?: string;
  ppq?: number;
};

export type MigrateLegacySongResult = {
  project: Project;
  warnings: string[];
  /** Quarters subtracted so first content section lands at tick 0. */
  shiftQuarters: number;
  legacySongId: string;
};

export type MigrateLegacyDatabaseResult = {
  projects: MigrateLegacySongResult[];
  setlist: {
    enabled: boolean;
    projectIds: string[];
    autoAdvance: { enabled: boolean };
  };
  warnings: string[];
};

function asFiniteNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function asString(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  const s = String(v).trim();
  return s.length > 0 ? s : fallback;
}

export function isLegacyCountdownSection(sec: LegacySection): boolean {
  const id = sec.id;
  if (id === 0 || id === "0") return true;
  const name = asString(sec.name).toLowerCase();
  return name === "countdown" || name === "cd" || name === "count-in";
}

export function parseLegacyMeter(
  raw: unknown,
  fallback: TimeSignature = { numerator: 4, denominator: 4 },
): TimeSignature {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as { numerator?: unknown; denominator?: unknown };
    const num = Math.floor(asFiniteNumber(o.numerator, fallback.numerator));
    const den = Math.floor(asFiniteNumber(o.denominator, fallback.denominator));
    if (num > 0 && den > 0) return { numerator: num, denominator: den };
  }
  const s = asString(raw);
  const m = /^(\d+)\s*\/\s*(\d+)$/.exec(s);
  if (!m) return fallback;
  const numerator = Number(m[1]);
  const denominator = Number(m[2]);
  if (!(numerator > 0) || !(denominator > 0)) return fallback;
  return { numerator, denominator };
}

/**
 * Deterministic UUID-shaped id from legacy song id (re-run stable; not RFC UUID).
 * Callers that need true UUID may pass `projectId` explicitly.
 */
export function legacySongIdToProjectId(legacyId: string): string {
  const hex = Array.from(legacyId)
    .reduce((acc, ch) => {
      const code = ch.charCodeAt(0);
      return (acc + code.toString(16).padStart(2, "0")).slice(0, 32);
    }, "")
    .padEnd(32, "0")
    .slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function toTicks(absBeat: number, shiftQuarters: number, ppq: number): number {
  return absBeatToTicks(absBeat - shiftQuarters, ppq);
}

function songEndAbs(song: LegacySong, sections: LegacySection[]): number {
  const endMarker = (song.markers ?? []).find(
    (m) => asString(m.kind).toUpperCase() === "END",
  );
  if (endMarker) return asFiniteNumber(endMarker.startAbs, 0);
  let max = 0;
  for (const s of sections) {
    max = Math.max(max, asFiniteNumber(s.startAbs, 0));
  }
  for (const c of song.chords?.clips ?? []) {
    max = Math.max(max, asFiniteNumber(c.startAbs, 0));
  }
  for (const line of song.vocal?.lines ?? []) {
    max = Math.max(max, asFiniteNumber(line.startAbs, 0));
  }
  return max > 0 ? max + 8 : 32;
}

/**
 * Length to the next distinct onset (same order as `startsAbs`).
 * Uses exact span to next onset so dense chords never overlap
 * (legacy `deriveClipLengths`); minLenBeats only when span ≤ 0 (duplicate start).
 */
export function onsetLengthsForStarts(
  startsAbs: number[],
  endAbs: number,
  minLenBeats: number,
): number[] {
  const sorted = [...startsAbs].sort((a, b) => a - b);
  return startsAbs.map((start) => {
    let next: number | undefined;
    for (const s of sorted) {
      if (s > start + 1e-9) {
        next = s;
        break;
      }
    }
    const span = (next ?? endAbs) - start;
    if (!(span > 0)) return Math.max(minLenBeats, 1e-6);
    return span;
  });
}

/** @deprecated index-aligned name — use onsetLengthsForStarts */
function onsetLengths(
  startsAbs: number[],
  endAbs: number,
  minLenBeats: number,
): number[] {
  return onsetLengthsForStarts(startsAbs, endAbs, minLenBeats);
}

/**
 * Map legacy absolute-beat subsections → relative tick offsets (v5 Forma).
 * Returns undefined when legacy has no usable interiors (caller defaults via ensure).
 */
export function mapLegacySubsectionOffsets(
  sec: LegacySection,
  sectionStartAbs: number,
  lengthTicks: number,
  ppq: number,
): number[] | undefined {
  const raw = sec.subsections;
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const offsets: number[] = [];
  for (const item of raw) {
    let abs: number;
    if (typeof item === "number") {
      abs = item;
    } else if (item && typeof item === "object" && !Array.isArray(item)) {
      abs = asFiniteNumber((item as { startAbs?: unknown }).startAbs, NaN);
    } else {
      continue;
    }
    if (!Number.isFinite(abs)) continue;
    const relTicks = absBeatToTicks(abs - sectionStartAbs, ppq);
    if (Number.isFinite(relTicks)) offsets.push(Math.round(relTicks));
  }
  const normalized = normalizeSubsectionOffsets(offsets, lengthTicks);
  return normalized.length > 0 ? normalized : undefined;
}

/**
 * Migrate one legacy 4.x song object → Project formatVersion 5.
 * Fail-fast via Zod at the end ([ADR 0005] ACL).
 */
export function migrateLegacySong(
  song: LegacySong,
  options: MigrateLegacySongOptions,
): MigrateLegacySongResult {
  const warnings: string[] = [];
  const ppq = options.ppq ?? DEFAULT_PPQ;
  const updatedAt = options.updatedAt ?? new Date().toISOString();
  const legacySongId = asString(song.id, "unknown");
  const projectId = options.projectId;

  const sections = Array.isArray(song.sections) ? [...song.sections] : [];
  sections.sort(
    (a, b) => asFiniteNumber(a.startAbs, 0) - asFiniteNumber(b.startAbs, 0),
  );

  const contentSections = sections.filter((s) => !isLegacyCountdownSection(s));
  const shiftQuarters =
    contentSections.length > 0
      ? asFiniteNumber(contentSections[0]!.startAbs, 0)
      : 0;

  if (sections.length === 0) {
    warnings.push(`song ${legacySongId}: no sections — empty Forma`);
  }

  const endAbs = songEndAbs(song, sections);
  const defaultMeter = parseLegacyMeter(song.chords?.timeSignature);
  const defaultBpm = Math.max(1, asFiniteNumber(song.tempo, 120));
  const minBarBeats =
    (defaultMeter.numerator * 4) / defaultMeter.denominator;
  /** One beat in quarters — dense chords must not use min=full bar (legacy deriveClipLengths). */
  const beatUnitQuarters = 4 / defaultMeter.denominator;

  // Forma clips
  const sectionStarts = sections.map((s) => asFiniteNumber(s.startAbs, 0));
  const sectionLens = onsetLengths(sectionStarts, endAbs, minBarBeats);
  const formaClips: FormaClip[] = sections.map((sec, i) => {
    const startAbs = asFiniteNumber(sec.startAbs, 0);
    const startTicks = toTicks(startAbs, shiftQuarters, ppq);
    const lengthBeats = asFiniteNumber(sec.lengthBeats, sectionLens[i]!);
    const lengthTicks = Math.max(1, absBeatToTicks(lengthBeats, ppq));
    const countdown = isLegacyCountdownSection(sec);
    const note = asString(sec.drumsNote);
    const mappedSubs = countdown
      ? undefined
      : mapLegacySubsectionOffsets(sec, startAbs, lengthTicks, ppq);
    return {
      id: countdown
        ? `forma-cd-${i}`
        : `forma-${asString(sec.id, String(i))}`,
      name: asString(sec.name, countdown ? "Countdown" : `Sekcja ${i + 1}`),
      kind: countdown ? ("countdown" as const) : ("section" as const),
      startTicks,
      lengthTicks,
      ...(note && !countdown ? { note } : {}),
      ...(mappedSubs ? { subsections: mappedSubs } : {}),
    };
  });

  // Tempo map
  const tempoMapRaw = Array.isArray(song.tempoMap) ? song.tempoMap : [];
  let tempoMap = tempoMapRaw.map((ev, i) => ({
    id: asString(ev.id, `tempo-${i}`),
    startTicks: toTicks(asFiniteNumber(ev.startAbs, 0), shiftQuarters, ppq),
    bpm: Math.max(1, asFiniteNumber(ev.bpm, defaultBpm)),
  }));
  if (tempoMap.length === 0) {
    tempoMap = [{ id: "tempo-0", startTicks: 0, bpm: defaultBpm }];
  }

  // Meter map
  const meterMapRaw = Array.isArray(song.meterMap) ? song.meterMap : [];
  let meterMap = meterMapRaw.map((ev, i) => {
    const meter = parseLegacyMeter(ev.meter, defaultMeter);
    return {
      id: asString(ev.id, `meter-${i}`),
      startTicks: toTicks(asFiniteNumber(ev.startAbs, 0), shiftQuarters, ppq),
      numerator: meter.numerator,
      denominator: meter.denominator,
    };
  });
  if (meterMap.length === 0) {
    meterMap = [
      {
        id: "meter-0",
        startTicks: 0,
        numerator: defaultMeter.numerator,
        denominator: defaultMeter.denominator,
      },
    ];
  }

  // Key map
  const keyFallback = {
    tonic: normalizeKeyTonic(song.key?.tonic, "C"),
    mode:
      asString(song.key?.mode, "major").toLowerCase() === "minor"
        ? ("minor" as const)
        : ("major" as const),
  };
  const keyMapRaw = Array.isArray(song.keyMap) ? song.keyMap : [];
  let keyMap = keyMapRaw.map((ev, i) => {
    const tonic = normalizeKeyTonic(ev.key?.tonic, keyFallback.tonic);
    const mode =
      asString(ev.key?.mode, keyFallback.mode).toLowerCase() === "minor"
        ? ("minor" as const)
        : ("major" as const);
    return {
      id: asString(ev.id, `key-${i}`),
      startTicks: toTicks(asFiniteNumber(ev.startAbs, 0), shiftQuarters, ppq),
      key: { tonic, mode },
    };
  });
  if (keyMap.length === 0) {
    keyMap = [{ id: "key-0", startTicks: 0, key: keyFallback }];
  }

  // Tekst: skip rests in output but keep them as length boundaries (v4 gap seal).
  // Drop legacy `vl-cd-*` digits — never persist; Client synthesizes from CD length
  // (TE-21 / Money Money: skipped rest must not stretch digit "1" into the song).
  const allVocalLines = song.vocal?.lines ?? [];
  const vocalBoundaryStarts = allVocalLines.map((l) =>
    asFiniteNumber(l.startAbs, 0),
  );
  const vocalBoundaryLens = onsetLengths(
    vocalBoundaryStarts,
    endAbs,
    beatUnitQuarters,
  );
  const contentVocal = allVocalLines
    .map((line, i) => ({ line, lengthBeats: vocalBoundaryLens[i]! }))
    .filter(
      ({ line }) =>
        !line.rest && !/^vl-cd-/i.test(asString(line.id)),
    );
  const tekstClips = contentVocal.map(({ line, lengthBeats }, i) => ({
    id: asString(line.id, `tekst-${i}`),
    startTicks: toTicks(asFiniteNumber(line.startAbs, 0), shiftQuarters, ppq),
    lengthTicks: Math.max(1, absBeatToTicks(lengthBeats, ppq)),
    text: asString(line.text, ""),
  }));

  // Akordy — length from onsets (or legacy lengthBeats); never min=bar for dense lines
  const chordClipsRaw = song.chords?.clips ?? [];
  const chordStarts = chordClipsRaw.map((c) => asFiniteNumber(c.startAbs, 0));
  const chordLens = onsetLengths(chordStarts, endAbs, beatUnitQuarters);
  const akordyClipsRaw = chordClipsRaw.map((c, i) => {
    const derived = chordLens[i]!;
    const fromLegacy =
      c.lengthBeats != null && Number(c.lengthBeats) > 0
        ? asFiniteNumber(c.lengthBeats, derived)
        : derived;
    return {
      id: asString(c.id, `akord-${i}`),
      startTicks: toTicks(asFiniteNumber(c.startAbs, 0), shiftQuarters, ppq),
      lengthTicks: Math.max(1, absBeatToTicks(fromLegacy, ppq)),
      symbol: asString(c.chord, "C") || "C",
    };
  });
  const akordyClips = sealAkordyLengths(akordyClipsRaw);
  // Cue
  const cuesRaw = Array.isArray(song.cues) ? song.cues : [];
  const barTicks = ticksPerBar(defaultMeter, ppq);
  const cueClips = cuesRaw.map((c, i) => {
    const lengthBeats = asFiniteNumber(c.lengthBeats, minBarBeats);
    return {
      id: asString(c.id, `cue-${i}`),
      startTicks: toTicks(asFiniteNumber(c.startAbs, 0), shiftQuarters, ppq),
      lengthTicks: Math.max(1, absBeatToTicks(lengthBeats, ppq) || barTicks),
      label: asString(c.text, "Cue") || "Cue",
    };
  });

  // Kotwice — logicBar stays song-bar index (display); no tick shift
  const scoreAnchorsRaw = song.scoreBarMap?.anchors ?? [];
  const scoreBarMap = {
    anchors: scoreAnchorsRaw.map((a, i) => {
      const logicRaw = a.logicBar ?? a.songBar ?? a.transportBar;
      return {
        id: asString(a.id, `anchor-${i}`),
        logicBar: Math.max(1, Math.floor(asFiniteNumber(logicRaw, 1))),
        scoreBar: Math.max(1, Math.floor(asFiniteNumber(a.scoreBar, 1))),
      };
    }),
  };

  const midiRaw = song.midiProgramId;
  const midiProgramId =
    midiRaw == null
      ? undefined
      : Math.min(127, Math.max(0, Math.floor(asFiniteNumber(midiRaw, 0))));

  const draft = {
    id: projectId,
    name: asString(song.title ?? song.name, "Untitled"),
    formatVersion: 5 as const,
    updatedAt,
    ppq: DEFAULT_PPQ,
    defaultBpm,
    defaultMeter,
    forma: { clips: formaClips },
    tempoMap,
    meterMap,
    keyMap,
    assets: [],
    audioTracks: [],
    audioClips: [],
    tekst: { clips: tekstClips },
    akordy: { clips: akordyClips },
    cue: { clips: cueClips },
    scoreBarMap,
    ...(midiProgramId != null ? { midiProgramId } : {}),
    ...(song.isTemplate === true ? { isTemplate: true } : {}),
    ...(asString(song.artist) ? { artist: asString(song.artist) } : {}),
    ...(asString(song.genre) ? { genre: asString(song.genre) } : {}),
  };

  const parsed = ProjectSchema.safeParse(draft);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(
      `Legacy song ${legacySongId} failed ProjectSchema: ${detail}`,
    );
  }

  // Scrub leftover digit / CD-span clips; fill missing Forma 4-bar subsections (v4).
  const project = ensureFormaSubsections(
    scrubCountdownDigitClips(parsed.data),
  );

  return {
    project,
    warnings,
    shiftQuarters,
    legacySongId,
  };
}

/**
 * Migrate a legacy `database.json` root → list of v5 projects + setlist draft.
 */
export function migrateLegacyDatabase(
  db: LegacyDatabase,
  options?: {
    updatedAt?: string;
    idForSong?: (legacyId: string, index: number) => string;
  },
): MigrateLegacyDatabaseResult {
  const warnings: string[] = [];
  if (!db || typeof db !== "object") {
    throw new Error("Legacy database must be an object");
  }
  const songs = Array.isArray(db.songs) ? db.songs : [];
  if (songs.length === 0) {
    throw new Error("Legacy database has no songs[]");
  }

  const idForSong =
    options?.idForSong ??
    ((legacyId: string) => legacySongIdToProjectId(legacyId || "song"));

  const projects: MigrateLegacySongResult[] = [];
  const legacyToProject = new Map<string, string>();

  songs.forEach((song, index) => {
    const legacyId = asString(song.id, `song-${index}`);
    const projectId = idForSong(legacyId, index);
    legacyToProject.set(legacyId, projectId);
    try {
      const result = migrateLegacySong(song, {
        projectId,
        updatedAt: options?.updatedAt,
      });
      projects.push(result);
      warnings.push(...result.warnings);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      warnings.push(`SKIP ${legacyId}: ${msg}`);
    }
  });

  if (projects.length === 0) {
    throw new Error("No songs migrated successfully");
  }

  const legacySetlistIds = Array.isArray(db.setlist?.songIds)
    ? db.setlist!.songIds!
    : [];
  const projectIds: string[] = [];
  for (const sid of legacySetlistIds) {
    const key = asString(sid);
    const mapped = legacyToProject.get(key);
    if (mapped) projectIds.push(mapped);
    else warnings.push(`setlist: unknown song id ${key}`);
  }

  return {
    projects,
    setlist: {
      enabled: Boolean(db.setlist?.enabled),
      projectIds,
      autoAdvance: {
        enabled: Boolean(db.settings?.setlistAutoAdvance),
      },
    },
    warnings,
  };
}
