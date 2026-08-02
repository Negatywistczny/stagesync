import { DEFAULT_PPQ } from "./time.js";
import type {
  ProjectV2,
  ProjectV3,
  ProjectV4,
  ProjectV5,
  ProjectV6,
  TekstBlock,
  TekstClip,
  TekstClipLine,
} from "./schema.js";

/** Alpha.3 seed: Countdown 2 bars @ PPQ 960, Intro from tick 0. */
export function createProjectV2Seed(
  id: string,
  name: string,
  updatedAt: string,
): ProjectV2 {
  return {
    id,
    name,
    formatVersion: 2,
    updatedAt,
    ppq: DEFAULT_PPQ,
    defaultBpm: 120,
    defaultMeter: { numerator: 4, denominator: 4 },
    forma: {
      clips: [
        {
          id: "forma-cd",
          name: "Countdown",
          kind: "countdown",
          startTicks: -7680,
          lengthTicks: 7680,
        },
        {
          id: "forma-intro",
          name: "Intro",
          kind: "section",
          startTicks: 0,
          lengthTicks: 7680,
        },
      ],
    },
    tempoMap: [{ id: "tempo-0", startTicks: 0, bpm: 120 }],
    meterMap: [
      { id: "meter-0", startTicks: 0, numerator: 4, denominator: 4 },
    ],
  };
}

/** Alpha.6 seed — v3 with empty assets / audio lanes. */
export function createProjectV3Seed(
  id: string,
  name: string,
  updatedAt: string,
): ProjectV3 {
  return upgradeProjectV2ToV3(createProjectV2Seed(id, name, updatedAt));
}

/** Alpha.7 seed — v4 with empty content lanes. */
export function createProjectV4Seed(
  id: string,
  name: string,
  updatedAt: string,
): ProjectV4 {
  return upgradeProjectV3ToV4(createProjectV3Seed(id, name, updatedAt));
}

/** Stable id for the bundled default library template (legacy v4 parity). */
export const DEFAULT_TEMPLATE_PROJECT_ID =
  "00000000-0000-4000-8000-000000000001";

/** Bundled wzór „Template” — Countdown + Intro, bez MIDI PC. */
export function createDefaultTemplateProject(
  updatedAt: string,
): ProjectV6 {
  return createProjectV6Seed(
    DEFAULT_TEMPLATE_PROJECT_ID,
    "Template",
    updatedAt,
    { isTemplate: true },
  );
}

/** Alpha.8 seed — v5 with keyMap + optional metadata. */
export function createProjectV5Seed(
  id: string,
  name: string,
  updatedAt: string,
  opts?: { midiProgramId?: number; isTemplate?: boolean },
): ProjectV5 {
  return upgradeProjectV4ToV5(createProjectV4Seed(id, name, updatedAt), opts);
}

/** Content Model seed — v6 with tekst blocks + empty melody. */
export function createProjectV6Seed(
  id: string,
  name: string,
  updatedAt: string,
  opts?: { midiProgramId?: number; isTemplate?: boolean },
): ProjectV6 {
  return upgradeProjectV5ToV6(createProjectV5Seed(id, name, updatedAt, opts));
}

/** @deprecated Prefer createProjectV6Seed. */
export function createProjectSeed(
  id: string,
  name: string,
  updatedAt: string,
): ProjectV6 {
  return createProjectV6Seed(id, name, updatedAt);
}

export function upgradeProjectV1ToV2(v1: {
  id: string;
  name: string;
  updatedAt: string;
}): ProjectV2 {
  return createProjectV2Seed(v1.id, v1.name, v1.updatedAt);
}

export function upgradeProjectV2ToV3(v2: ProjectV2): ProjectV3 {
  return {
    ...v2,
    formatVersion: 3,
    assets: [],
    audioTracks: [],
    audioClips: [],
  };
}

export function upgradeProjectV3ToV4(v3: ProjectV3): ProjectV4 {
  return {
    ...v3,
    formatVersion: 4,
    tekst: { clips: [] },
    akordy: { clips: [] },
    cue: { clips: [] },
  };
}

export function upgradeProjectV4ToV5(
  v4: ProjectV4,
  opts?: { midiProgramId?: number; isTemplate?: boolean },
): ProjectV5 {
  const isTemplate = opts?.isTemplate === true;
  return {
    ...v4,
    formatVersion: 5,
    keyMap: [
      {
        id: "key-0",
        startTicks: 0,
        key: { tonic: "C", mode: "major" },
      },
    ],
    scoreBarMap: { anchors: [] },
    ...(isTemplate
      ? { isTemplate: true as const }
      : {
          midiProgramId:
            opts?.midiProgramId != null ? opts.midiProgramId : 0,
        }),
  };
}

/** One whole-line block matching clip timing/text (V5→V6 migrate / producers). */
export function wholeLineTekstBlock(
  clip: Pick<TekstClipLine, "id" | "startTicks" | "lengthTicks" | "text">,
): TekstBlock {
  return {
    id: `${clip.id}-block-0`,
    startTicks: clip.startTicks,
    lengthTicks: clip.lengthTicks,
    text: clip.text,
  };
}

/** Attach a single whole-line block (UG / legacy / countdown / migrate). */
export function withWholeLineTekstBlocks(
  clip: TekstClipLine,
): TekstClip {
  return {
    ...clip,
    blocks: [wholeLineTekstBlock(clip)],
  };
}

/**
 * V5 → V6: one block = whole line; empty melody lane.
 * Preserves tekst / akordy / audio / cue / meta as-is.
 */
export function upgradeProjectV5ToV6(v5: ProjectV5): ProjectV6 {
  return {
    ...v5,
    formatVersion: 6,
    tekst: {
      clips: v5.tekst.clips.map((clip) => withWholeLineTekstBlocks(clip)),
    },
    melody: { clips: [] },
  };
}

/** Next free MIDI PC in 0–127 among library entries (non-templates). */
export function nextMidiProgramId(
  entries: { midiProgramId?: number; isTemplate?: boolean }[],
): number | null {
  const used = new Set(
    entries
      .filter((e) => e.isTemplate !== true && e.midiProgramId != null)
      .map((e) => e.midiProgramId as number),
  );
  for (let i = 0; i <= 127; i++) {
    if (!used.has(i)) return i;
  }
  return null;
}
