import { readFile } from "node:fs/promises";
import {
  ProjectSchema,
  ProjectSchemaV1,
  ProjectSchemaV2,
  ProjectSchemaV3,
  ProjectSchemaV4,
  ProjectSchemaV5,
  ensureFormaSubsections,
  formatKeySignature,
  projectEndTicks,
  resolveKeyAt,
  ticksToMsAlongTempoMap,
  upgradeProjectV1ToV2,
  upgradeProjectV2ToV3,
  upgradeProjectV3ToV4,
  upgradeProjectV4ToV5,
  upgradeProjectV5ToV6,
  type LibraryProjectEntry,
  type Project,
} from "@stagesync/shared";

export async function readJsonFile(filePath: string): Promise<unknown> {
  const text = await readFile(filePath, "utf8");
  return JSON.parse(text) as unknown;
}

export function isProjectV1(raw: unknown): boolean {
  return (
    raw !== null &&
    typeof raw === "object" &&
    "formatVersion" in raw &&
    (raw as { formatVersion: number }).formatVersion === 1
  );
}

export function isProjectV2(raw: unknown): boolean {
  return (
    raw !== null &&
    typeof raw === "object" &&
    "formatVersion" in raw &&
    (raw as { formatVersion: number }).formatVersion === 2
  );
}

export function isProjectV3(raw: unknown): boolean {
  return (
    raw !== null &&
    typeof raw === "object" &&
    "formatVersion" in raw &&
    (raw as { formatVersion: number }).formatVersion === 3
  );
}

export function isProjectV4(raw: unknown): boolean {
  return (
    raw !== null &&
    typeof raw === "object" &&
    "formatVersion" in raw &&
    (raw as { formatVersion: number }).formatVersion === 4
  );
}

export function isProjectV5(raw: unknown): boolean {
  return (
    raw !== null &&
    typeof raw === "object" &&
    "formatVersion" in raw &&
    (raw as { formatVersion: number }).formatVersion === 5
  );
}

export function libraryEntryFromProject(project: Project): LibraryProjectEntry {
  const key = resolveKeyAt(project, 0);
  const keyLabel = key ? formatKeySignature(key) : undefined;
  const endTicks = projectEndTicks(project);
  let durationMs: number | undefined;
  try {
    const ms = ticksToMsAlongTempoMap(0, endTicks, project);
    if (Number.isFinite(ms) && ms >= 0) {
      durationMs = Math.round(ms);
    }
  } catch {
    durationMs = undefined;
  }
  return {
    id: project.id,
    name: project.name,
    updatedAt: project.updatedAt,
    ...(project.isTemplate === true
      ? { isTemplate: true }
      : project.midiProgramId != null
        ? { midiProgramId: project.midiProgramId }
        : {}),
    ...(project.artist ? { artist: project.artist } : {}),
    ...(project.genre ? { genre: project.genre } : {}),
    hasMusicXml: project.assets.some((a) => a.kind === "musicxml"),
    defaultBpm: project.defaultBpm,
    ...(keyLabel && keyLabel !== "—" ? { keyLabel } : {}),
    ...(durationMs != null ? { durationMs } : {}),
  };
}

/** V1…V5 → V6 via seed-chain upgrades; V6 validated in place. */
export function upgradeToV6(raw: unknown): Project {
  let project: Project;
  if (isProjectV1(raw)) {
    project = upgradeProjectV5ToV6(
      upgradeProjectV4ToV5(
        upgradeProjectV3ToV4(
          upgradeProjectV2ToV3(
            upgradeProjectV1ToV2(ProjectSchemaV1.parse(raw)),
          ),
        ),
      ),
    );
  } else if (isProjectV2(raw)) {
    project = upgradeProjectV5ToV6(
      upgradeProjectV4ToV5(
        upgradeProjectV3ToV4(upgradeProjectV2ToV3(ProjectSchemaV2.parse(raw))),
      ),
    );
  } else if (isProjectV3(raw)) {
    project = upgradeProjectV5ToV6(
      upgradeProjectV4ToV5(upgradeProjectV3ToV4(ProjectSchemaV3.parse(raw))),
    );
  } else if (isProjectV4(raw)) {
    project = upgradeProjectV5ToV6(
      upgradeProjectV4ToV5(ProjectSchemaV4.parse(raw)),
    );
  } else if (isProjectV5(raw)) {
    project = upgradeProjectV5ToV6(ProjectSchemaV5.parse(raw));
  } else {
    project = ProjectSchema.parse(raw);
  }
  // Migrated / early-α projects often lack Forma subsections — recompute v4 4-bar.
  return ensureFormaSubsections(project);
}

export function needsSchemaRewrite(raw: unknown): boolean {
  if (raw === null || typeof raw !== "object") return true;
  const fv = (raw as { formatVersion?: unknown }).formatVersion;
  return fv !== 6;
}
