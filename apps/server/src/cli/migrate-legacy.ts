#!/usr/bin/env node
/**
 * CLI: migrate legacy 4.x database.json → StageSync v5 projects.
 *
 *   pnpm migrate:legacy -- --input path/to/database.json --dry-run
 *   pnpm migrate:legacy -- --input path/to/database.json --data-dir ./data --apply
 *   pnpm migrate:legacy -- --input … --data-dir ./data --uploads-dir ./uploads --apply
 *
 * Docs: docs/MIGRATION.md
 */

import {
  readFile,
  writeFile,
  mkdir,
  copyFile,
  access,
  stat,
} from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  detectLibraryImportFormat,
  migrateLegacyDatabase,
  ProjectSchema,
  SetlistSchema,
  LibrarySchema,
  type LegacyDatabase,
  type LegacyPendingAsset,
  type Project,
} from "@stagesync/shared";

/** Monorepo root (apps/server/src/cli → ../../../..) */
const REPO_ROOT = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../..",
);

function resolveUserPath(p: string): string {
  if (isAbsolute(p)) return p;
  // Prefer repo-root-relative paths (docs/examples/...) when invoked via pnpm --filter.
  return resolve(REPO_ROOT, p);
}

function usage(): void {
  console.log(`Usage:
  pnpm migrate:legacy -- --input <database.json> --dry-run
  pnpm migrate:legacy -- --input <database.json> --data-dir <dir> --apply
  pnpm migrate:legacy -- --input <database.json> --data-dir <dir> --uploads-dir <dir> --apply

Options:
  --input         Path to legacy 4.x database.json
  --data-dir      v5 data root (contains library/ + projects/)
  --uploads-dir   Legacy uploads/ (MusicXML / audio / local covers). Default: <input-dir>/uploads or ../uploads
  --dry-run       Report only (default if --apply omitted)
  --apply         Write project.json files + merge library/setlist + copy pending assets
  --help          Show this help
`);
}

function parseArgs(argv: string[]) {
  const out: {
    help?: boolean;
    dryRun: boolean;
    apply: boolean;
    input: string | null;
    dataDir: string | null;
    uploadsDir: string | null;
  } = {
    dryRun: true,
    apply: false,
    input: null,
    dataDir: null,
    uploadsDir: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--dry-run") {
      out.dryRun = true;
      out.apply = false;
    } else if (a === "--apply") {
      out.apply = true;
      out.dryRun = false;
    } else if (a === "--input") out.input = argv[++i] ?? null;
    else if (a === "--data-dir") out.dataDir = argv[++i] ?? null;
    else if (a === "--uploads-dir") out.uploadsDir = argv[++i] ?? null;
  }
  return out;
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function resolveUploadsDir(
  explicit: string | null,
  inputPath: string,
): Promise<string | null> {
  if (explicit) return resolveUserPath(explicit);
  const beside = join(dirname(inputPath), "uploads");
  if (await pathExists(beside)) return beside;
  const sibling = join(dirname(inputPath), "..", "uploads");
  if (await pathExists(sibling)) return resolve(sibling);
  return null;
}

async function materializePendingAssets(
  project: Project,
  pending: LegacyPendingAsset[],
  uploadsDir: string | null,
  assetsDir: string,
): Promise<{ project: Project; warnings: string[] }> {
  const warnings: string[] = [];
  if (pending.length === 0) return { project, warnings };
  if (!uploadsDir) {
    warnings.push(
      `${project.name}: ${pending.length} asset(s) pending — pass --uploads-dir to copy files`,
    );
    return { project, warnings };
  }

  await mkdir(assetsDir, { recursive: true });
  const sizeById = new Map<string, number>();

  for (const item of pending) {
    const src = join(uploadsDir, item.sourceFileName);
    const dest = join(assetsDir, item.storageName);
    if (!(await pathExists(src))) {
      warnings.push(
        `${project.name}: missing upload "${item.sourceFileName}" (${item.kind})`,
      );
      continue;
    }
    await copyFile(src, dest);
    const st = await stat(dest);
    sizeById.set(item.assetId, st.size);
  }

  if (sizeById.size === 0) return { project, warnings };

  const nextAssets = project.assets.map((a) => {
    const size = sizeById.get(a.id);
    return size != null ? { ...a, sizeBytes: size } : a;
  });
  const next = ProjectSchema.parse({ ...project, assets: nextAssets });
  return { project: next, warnings };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2).filter((a) => a !== "--"));
  if (args.help || !args.input) {
    usage();
    process.exit(args.help ? 0 : 1);
  }

  const inputPath = resolveUserPath(args.input);
  const raw: unknown = JSON.parse(await readFile(inputPath, "utf8"));
  const detected = detectLibraryImportFormat(raw);
  if (detected.format === "unknown") {
    console.error(detected.reason);
    process.exit(1);
  }
  if (detected.format === "v5-pack") {
    console.error(
      "To wygląda na pakiet v5 ({ projects }). CLI migrate:legacy obsługuje legacy database.json — użyj Admin → Utwory (Pliki) albo POST /api/library/import.",
    );
    process.exit(1);
  }
  const result = migrateLegacyDatabase(raw as LegacyDatabase, {
    updatedAt: new Date().toISOString(),
  });

  console.log(`Migrated ${result.projects.length} song(s) from ${inputPath}`);
  for (const p of result.projects) {
    const proj = p.project;
    console.log(
      `  • ${p.legacySongId} → ${proj.id}  "${proj.name}"  forma=${proj.forma.clips.length} tekst=${proj.tekst.clips.length} akordy=${proj.akordy.clips.length} cue=${proj.cue.clips.length} assets=${proj.assets.length}  shift=${p.shiftQuarters}`,
    );
  }
  if (result.warnings.length) {
    console.log("Warnings:");
    for (const w of result.warnings) console.log(`  ! ${w}`);
  }
  console.log(
    `Setlist: enabled=${result.setlist.enabled} songs=${result.setlist.projectIds.length} autoAdvance=${result.setlist.autoAdvance.enabled}`,
  );

  if (args.dryRun || !args.apply) {
    console.log(
      "Dry-run only — no files written. Pass --apply --data-dir to write.",
    );
    return;
  }

  if (!args.dataDir) {
    console.error("--apply requires --data-dir");
    process.exit(1);
  }

  const dataDir = resolveUserPath(args.dataDir);
  const uploadsDir = await resolveUploadsDir(args.uploadsDir, inputPath);
  if (uploadsDir) {
    console.log(`Uploads dir: ${uploadsDir}`);
  } else {
    console.log(
      "Uploads dir: (none) — MusicXML/audio refs kept; copy later with --uploads-dir",
    );
  }

  const libraryDir = join(dataDir, "library");
  const projectsDir = join(dataDir, "projects");
  const libraryFile = join(libraryDir, "library.json");
  const setlistFile = join(libraryDir, "setlist.json");

  const bak = `${inputPath}.pre-migrate.bak`;
  await copyFile(inputPath, bak);
  console.log(`Shadow backup: ${bak}`);

  await mkdir(libraryDir, { recursive: true });
  await mkdir(projectsDir, { recursive: true });

  let library = {
    version: 1 as const,
    projects: [] as ReturnType<typeof LibrarySchema.parse>["projects"],
  };
  if (await pathExists(libraryFile)) {
    library = LibrarySchema.parse(
      JSON.parse(await readFile(libraryFile, "utf8")),
    );
  }

  const byId = new Map(library.projects.map((e) => [e.id, e]));
  for (const { project: migrated, pendingAssets } of result.projects) {
    const dir = join(projectsDir, migrated.id);
    const assetsDir = join(dir, "assets");
    await mkdir(assetsDir, { recursive: true });
    const { project, warnings: assetWarnings } = await materializePendingAssets(
      migrated,
      pendingAssets,
      uploadsDir,
      assetsDir,
    );
    for (const w of assetWarnings) {
      console.log(`  ! ${w}`);
    }
    const projectFile = join(dir, "project.json");
    if (await pathExists(projectFile)) {
      await copyFile(projectFile, `${projectFile}.bak`);
    }
    await writeFile(
      projectFile,
      `${JSON.stringify(project, null, 2)}\n`,
      "utf8",
    );
    byId.set(project.id, {
      id: project.id,
      name: project.name,
      updatedAt: project.updatedAt,
      ...(project.midiProgramId != null
        ? { midiProgramId: project.midiProgramId }
        : {}),
      ...(project.isTemplate ? { isTemplate: true } : {}),
      ...(project.artist ? { artist: project.artist } : {}),
      ...(project.genre ? { genre: project.genre } : {}),
    });
  }

  const nextLibrary = LibrarySchema.parse({
    version: 1,
    projects: [...byId.values()],
  });
  await writeFile(
    libraryFile,
    `${JSON.stringify(nextLibrary, null, 2)}\n`,
    "utf8",
  );

  const nextSetlist = SetlistSchema.parse({
    version: 1,
    enabled: result.setlist.enabled,
    projectIds: result.setlist.projectIds,
    autoAdvance: result.setlist.autoAdvance,
  });
  if (await pathExists(setlistFile)) {
    await copyFile(setlistFile, `${setlistFile}.bak`);
  }
  await writeFile(
    setlistFile,
    `${JSON.stringify(nextSetlist, null, 2)}\n`,
    "utf8",
  );

  console.log(`Wrote ${result.projects.length} project(s) under ${projectsDir}`);
  console.log(`Updated ${libraryFile}`);
  console.log(`Updated ${setlistFile}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
