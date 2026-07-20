import { DEFAULT_PPQ } from "./time.js";
import type { ProjectV2, ProjectV3 } from "./schema.js";

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

/** @deprecated Prefer createProjectV3Seed. */
export function createProjectSeed(
  id: string,
  name: string,
  updatedAt: string,
): ProjectV3 {
  return createProjectV3Seed(id, name, updatedAt);
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
