import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createProjectV2Seed,
  createProjectV3Seed,
  createProjectV4Seed,
  createProjectV5Seed,
} from "@stagesync/shared";
import {
  ConflictError,
  NotFoundError,
  StorageError,
  createStores,
} from "./index.js";

const fsHooks = vi.hoisted(() => ({
  access: null as null | ((path: string) => Promise<void>),
  unlink: null as null | ((path: string) => Promise<void>),
  rm: null as null | ((path: string) => Promise<void>),
  readFile: null as null | ((path: string) => Promise<string>),
}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    access: async (
      path: Parameters<typeof actual.access>[0],
      mode?: Parameters<typeof actual.access>[1],
    ) => {
      if (fsHooks.access) return fsHooks.access(String(path));
      return actual.access(path, mode);
    },
    unlink: async (path: Parameters<typeof actual.unlink>[0]) => {
      if (fsHooks.unlink) return fsHooks.unlink(String(path));
      return actual.unlink(path);
    },
    rm: async (
      path: Parameters<typeof actual.rm>[0],
      opts?: Parameters<typeof actual.rm>[1],
    ) => {
      if (fsHooks.rm) return fsHooks.rm(String(path));
      return actual.rm(path, opts);
    },
    readFile: async (
      path: Parameters<typeof actual.readFile>[0],
      opts?: Parameters<typeof actual.readFile>[1],
    ) => {
      if (fsHooks.readFile) return fsHooks.readFile(String(path));
      return actual.readFile(path, opts as never);
    },
  };
});

describe("storage/index", () => {
  const dirs: string[] = [];

  afterEach(async () => {
    fsHooks.access = null;
    fsHooks.unlink = null;
    fsHooks.rm = null;
    fsHooks.readFile = null;
    await Promise.all(
      dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })),
    );
  });

  async function tmpData(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), "ss-store-"));
    dirs.push(dir);
    return dir;
  }

  async function writeLib(dataDir: string, library: unknown): Promise<void> {
    await mkdir(join(dataDir, "library"), { recursive: true });
    await writeFile(
      join(dataDir, "library", "library.json"),
      JSON.stringify(library),
    );
  }

  async function writeProjectFile(
    dataDir: string,
    id: string,
    raw: unknown,
  ): Promise<void> {
    const dir = join(dataDir, "projects", id);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "project.json"), JSON.stringify(raw));
  }

  it("seeds default template when library has no template entry", async () => {
    const dataDir = await tmpData();
    await writeLib(dataDir, { version: 1, projects: [] });
    const library = await createStores(dataDir).getLibrary();
    expect(library.projects.some((p) => p.isTemplate === true)).toBe(true);
  });

  it("rejects invalid library / setlist shapes and non-ENOENT reads", async () => {
    const dataDir = await tmpData();
    await writeLib(dataDir, { version: 99, projects: [] });
    const stores = createStores(dataDir);
    await expect(stores.getLibrary()).rejects.toBeInstanceOf(StorageError);

    await mkdir(join(dataDir, "library"), { recursive: true });
    await writeFile(join(dataDir, "library", "library.json"), "{not-json");
    await expect(stores.getLibrary()).rejects.toThrow(/Failed to read library/);

    await writeLib(dataDir, { version: 1, projects: [] });
    await mkdir(join(dataDir, "library", "setlist.json"), { recursive: true });
    await expect(stores.getSetlist()).rejects.toMatchObject({
      name: "StorageError",
    });

    await rm(join(dataDir, "library", "setlist.json"), {
      recursive: true,
      force: true,
    });
    await writeFile(
      join(dataDir, "library", "setlist.json"),
      JSON.stringify({ version: 9 }),
    );
    await expect(stores.getSetlist()).rejects.toBeInstanceOf(StorageError);
  });

  it("fails seed when template is missing", async () => {
    const dataDir = await tmpData();
    const seedDir = await mkdtemp(join(tmpdir(), "ss-seed-empty-"));
    dirs.push(seedDir);
    const prev = process.env.STAGESYNC_SEED_DIR;
    process.env.STAGESYNC_SEED_DIR = seedDir;
    try {
      await expect(createStores(dataDir).getLibrary()).rejects.toBeInstanceOf(
        StorageError,
      );
    } finally {
      if (prev === undefined) delete process.env.STAGESYNC_SEED_DIR;
      else process.env.STAGESYNC_SEED_DIR = prev;
    }
  });

  it("upgrades v1–v4 on get and migrate edges", async () => {
    const dataDir = await tmpData();
    const id1 = "00000000-0000-4000-8000-000000000001";
    const id2 = "00000000-0000-4000-8000-000000000002";
    const id3 = "00000000-0000-4000-8000-000000000003";
    const id4 = "00000000-0000-4000-8000-000000000004";
    const id5 = "00000000-0000-4000-8000-000000000005";
    await writeLib(dataDir, {
      version: 1,
      projects: [
        {
          id: id5,
          name: "Tpl",
          updatedAt: "2026-07-21T00:00:00.000Z",
          isTemplate: true,
        },
      ],
    });
    await writeProjectFile(dataDir, id1, {
      id: id1,
      name: "V1",
      formatVersion: 1,
      updatedAt: "2026-07-21T00:00:00.000Z",
    });
    await writeProjectFile(
      dataDir,
      id2,
      createProjectV2Seed(id2, "V2", "2026-07-21T00:00:00.000Z"),
    );
    await writeProjectFile(
      dataDir,
      id3,
      createProjectV3Seed(id3, "V3", "2026-07-21T00:00:00.000Z"),
    );
    await writeProjectFile(
      dataDir,
      id4,
      createProjectV4Seed(id4, "V4", "2026-07-21T00:00:00.000Z"),
    );
    await writeProjectFile(
      dataDir,
      id5,
      createProjectV5Seed(id5, "Tpl", "2026-07-21T00:00:00.000Z", {
        isTemplate: true,
      }),
    );

    const stores = createStores(dataDir);
    expect((await stores.getProject(id1)).formatVersion).toBe(5);
    expect((await stores.getProject(id2)).formatVersion).toBe(5);
    expect((await stores.getProject(id3)).formatVersion).toBe(5);
    expect((await stores.getProject(id4)).formatVersion).toBe(5);
    expect(await stores.migrateProjectOnDisk(id5)).toBe(false);
    expect(await stores.migrateProjectOnDisk(id1)).toBe(true);

    const orphan = "00000000-0000-4000-8000-0000000000aa";
    await writeProjectFile(
      dataDir,
      orphan,
      createProjectV4Seed(orphan, "Orphan", "2026-07-21T00:00:00.000Z"),
    );
    expect(await stores.migrateProjectOnDisk(orphan)).toBe(true);
    expect(
      (await stores.getLibrary()).projects.some((p) => p.id === orphan),
    ).toBe(true);
  });

  it("maps project read errors and creates from template / as template", async () => {
    const dataDir = await tmpData();
    const stores = createStores(dataDir);
    const tplId = (await stores.getLibrary()).projects.find(
      (p) => p.isTemplate,
    )?.id;
    expect(tplId).toBeTruthy();

    const fromTpl = await stores.createProject("FromTpl", {
      fromTemplateId: tplId,
    });
    expect(fromTpl.midiProgramId).toBeTypeOf("number");

    expect(
      (await stores.createProject("NewTpl", { isTemplate: true })).isTemplate,
    ).toBe(true);

    const song = await stores.createProject("Song");
    await expect(
      stores.createProject("Bad", { fromTemplateId: song.id }),
    ).rejects.toThrow(/template/i);

    const badId = "00000000-0000-4000-8000-0000000000bb";
    await writeProjectFile(dataDir, badId, {
      id: badId,
      name: "Broken",
      formatVersion: 5,
      updatedAt: "not-a-date",
    });
    await expect(stores.getProject(badId)).rejects.toBeInstanceOf(StorageError);

    await mkdir(
      join(dataDir, "projects", "00000000-0000-4000-8000-0000000000cc"),
      { recursive: true },
    );
    await expect(
      stores.getProject("00000000-0000-4000-8000-0000000000cc"),
    ).rejects.toBeInstanceOf(NotFoundError);

    fsHooks.readFile = async (path) => {
      if (path.endsWith("project.json")) {
        throw Object.assign(new Error("EACCES"), { code: "EACCES" });
      }
      return readFile(path, "utf8");
    };
    await expect(stores.getProject(song.id)).rejects.toBeInstanceOf(
      StorageError,
    );
    fsHooks.readFile = null;

    const { midiProgramId: _drop, ...noPc } = song;
    void _drop;
    await stores.putProject(song.id, { ...noPc, updatedAt: song.updatedAt });
    expect(
      (await stores.getLibrary()).projects.find((p) => p.id === song.id)
        ?.midiProgramId,
    ).toBeUndefined();
  });

  it("putProject re-adds missing library entry with artist/genre", async () => {
    const dataDir = await tmpData();
    const stores = createStores(dataDir);
    const project = await stores.createProject("Meta");
    await writeLib(dataDir, {
      version: 1,
      projects: [
        {
          id: (await stores.getLibrary()).projects.find((p) => p.isTemplate)!
            .id,
          name: "Template",
          updatedAt: "2026-07-21T00:00:00.000Z",
          isTemplate: true,
        },
      ],
    });

    const next = await stores.putProject(project.id, {
      ...project,
      name: "Meta2",
      artist: "Band",
      genre: "Rock",
      updatedAt: project.updatedAt,
    });
    expect(next.artist).toBe("Band");
    const entry = (await stores.getLibrary()).projects.find(
      (p) => p.id === project.id,
    );
    expect(entry?.artist).toBe("Band");
    expect(entry?.genre).toBe("Rock");
    expect(entry?.midiProgramId).toBe(next.midiProgramId);

    await expect(
      stores.putProject(project.id, {
        ...next,
        updatedAt: "2020-01-01T00:00:00.000Z",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("batchMidiProgramIds and patchSetlistAutoAdvance", async () => {
    const dataDir = await tmpData();
    const stores = createStores(dataDir);
    const a = await stores.createProject("A");
    const b = await stores.createProject("B");
    const tpl = (await stores.getLibrary()).projects.find((p) => p.isTemplate)!;

    expect(
      (
        await stores.batchMidiProgramIds([
          { id: a.id, midiProgramId: 40 },
          { id: b.id, midiProgramId: 41 },
        ])
      ).projects.find((p) => p.id === a.id)?.midiProgramId,
    ).toBe(40);

    await expect(
      stores.batchMidiProgramIds([{ id: a.id, midiProgramId: 41 }]),
    ).rejects.toThrow(/already used/);
    await expect(
      stores.batchMidiProgramIds([{ id: tpl.id, midiProgramId: 42 }]),
    ).rejects.toThrow(/template/i);

    const setlist = await stores.patchSetlistAutoAdvance(true);
    expect(setlist.autoAdvance.enabled).toBe(true);
  });

  it("deleteProject prunes setlist and maps rm failures", async () => {
    const dataDir = await tmpData();
    const stores = createStores(dataDir);
    const project = await stores.createProject("DelMe");
    await stores.putSetlist({
      enabled: true,
      items: [
        { type: "project", projectId: project.id },
        {
          type: "break",
          id: "00000000-0000-4000-8000-00000000b001",
          durationMinutes: 5,
          label: "Pause",
        },
      ],
    });
    await stores.deleteProject(project.id);
    expect(
      (await stores.getSetlist()).items.every((i) => i.type !== "project"),
    ).toBe(true);

    await expect(
      stores.deleteProject("00000000-0000-4000-8000-0000000000de"),
    ).rejects.toBeInstanceOf(NotFoundError);

    const again = await stores.createProject("RmFail");
    fsHooks.rm = async () => {
      throw Object.assign(new Error("EBUSY"), { code: "EBUSY" });
    };
    await expect(stores.deleteProject(again.id)).rejects.toBeInstanceOf(
      StorageError,
    );
  });

  it("materializeSeedProjects skips missing seeds and maps access errors", async () => {
    const dataDir = await tmpData();
    const validSeedId = "00000000-0000-4000-8000-00000000c0de";
    await writeLib(dataDir, {
      version: 1,
      projects: [
        {
          id: validSeedId,
          name: "Seeded",
          updatedAt: "2026-07-21T00:00:00.000Z",
          isTemplate: true,
        },
      ],
    });
    const stores = createStores(dataDir);
    await expect(stores.getLibrary()).resolves.toBeTruthy();

    fsHooks.access = async () => {
      throw Object.assign(new Error("EACCES"), { code: "EACCES" });
    };
    await expect(stores.getLibrary()).rejects.toBeInstanceOf(StorageError);
    fsHooks.access = null;

    const seedDir = await mkdtemp(join(tmpdir(), "ss-seed-bad-"));
    dirs.push(seedDir);
    await mkdir(join(seedDir, "seed-projects", validSeedId), {
      recursive: true,
    });
    await writeFile(
      join(seedDir, "seed-projects", validSeedId, "project.json"),
      "{not-json",
    );
    await writeFile(
      join(seedDir, "library.template.json"),
      JSON.stringify({
        version: 1,
        projects: [
          {
            id: validSeedId,
            name: "Seeded",
            updatedAt: "2026-07-21T00:00:00.000Z",
            isTemplate: true,
          },
        ],
      }),
    );
    const dataDir2 = await tmpData();
    const prev = process.env.STAGESYNC_SEED_DIR;
    process.env.STAGESYNC_SEED_DIR = seedDir;
    try {
      await writeLib(dataDir2, {
        version: 1,
        projects: [
          {
            id: validSeedId,
            name: "Seeded",
            updatedAt: "2026-07-21T00:00:00.000Z",
            isTemplate: true,
          },
        ],
      });
      await expect(createStores(dataDir2).getLibrary()).rejects.toBeInstanceOf(
        StorageError,
      );
    } finally {
      if (prev === undefined) delete process.env.STAGESYNC_SEED_DIR;
      else process.env.STAGESYNC_SEED_DIR = prev;
    }
  });

  it("asset helpers including clip creation and musicxml", async () => {
    const dataDir = await tmpData();
    const stores = createStores(dataDir);
    const project = await stores.createProject("Assets");

    const audio = await stores.addProjectAsset(
      project.id,
      {
        id: "asset-audio",
        kind: "audio",
        originalName: "a.wav",
        storageName: "a.wav",
        mimeType: "audio/wav",
        sizeBytes: 3,
      },
      Buffer.from([1, 2, 3]),
    );
    expect(audio.audioTracks.length).toBeGreaterThanOrEqual(1);
    expect(audio.audioClips.length).toBeGreaterThanOrEqual(1);

    const withXml = await stores.addProjectAsset(
      audio.id,
      {
        id: "asset-xml",
        kind: "musicxml",
        originalName: "score.musicxml",
        storageName: "score.musicxml",
        mimeType: "application/vnd.recordare.musicxml+xml",
        sizeBytes: 2,
      },
      Buffer.from("<xml/>"),
      { createAudioClip: false },
    );
    expect(
      (await stores.getLibrary()).projects.find((p) => p.id === project.id)
        ?.hasMusicXml,
    ).toBe(true);

    expect(
      (await stores.getAssetFilePath(project.id, "asset-audio")).path,
    ).toContain("a.wav");
    await expect(
      stores.getAssetFilePath(project.id, "missing"),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      stores.deleteProjectAsset(project.id, "missing"),
    ).rejects.toBeInstanceOf(NotFoundError);

    fsHooks.unlink = async () => {
      throw Object.assign(new Error("EPERM"), { code: "EPERM" });
    };
    await expect(
      stores.deleteProjectAsset(project.id, "asset-xml"),
    ).rejects.toBeInstanceOf(StorageError);
    fsHooks.unlink = async () => {
      throw Object.assign(new Error("gone"), { code: "ENOENT" });
    };
    expect(
      (await stores.deleteProjectAsset(project.id, "asset-xml")).assets.some(
        (a) => a.id === "asset-xml",
      ),
    ).toBe(false);
    void withXml;
  });

  it("rejects create when no free MIDI program remains", async () => {
    const dataDir = await tmpData();
    const tplId = "00000000-0000-4000-8000-00000000ffff";
    const ids = Array.from({ length: 128 }, (_, i) => {
      const hex = i.toString(16).padStart(12, "0");
      return `10000000-0000-4000-8000-${hex}`;
    });
    await writeLib(dataDir, {
      version: 1,
      projects: [
        {
          id: tplId,
          name: "Template",
          updatedAt: "2026-07-21T00:00:00.000Z",
          isTemplate: true,
        },
        ...ids.map((id, i) => ({
          id,
          name: `P${i}`,
          updatedAt: "2026-07-21T00:00:00.000Z",
          midiProgramId: i,
        })),
      ],
    });
    await writeProjectFile(
      dataDir,
      tplId,
      createProjectV5Seed(tplId, "Template", "2026-07-21T00:00:00.000Z", {
        isTemplate: true,
      }),
    );
    for (let i = 0; i < 128; i++) {
      await writeProjectFile(
        dataDir,
        ids[i]!,
        createProjectV5Seed(ids[i]!, `P${i}`, "2026-07-21T00:00:00.000Z", {
          midiProgramId: i,
        }),
      );
    }
    await expect(
      createStores(dataDir).createProject("Overflow", {
        fromTemplateId: tplId,
      }),
    ).rejects.toThrow(/No free MIDI/);
  });

  it("readProjectRaw maps ENOENT and non-ENOENT during migrate", async () => {
    const dataDir = await tmpData();
    const stores = createStores(dataDir);
    await stores.getLibrary();
    await expect(
      stores.migrateProjectOnDisk("00000000-0000-4000-8000-00000000a155"),
    ).rejects.toBeInstanceOf(NotFoundError);

    const song = await stores.createProject("Raw");
    fsHooks.readFile = async (path) => {
      if (path.endsWith("project.json")) {
        throw Object.assign(new Error("EACCES"), { code: "EACCES" });
      }
      return readFile(path, "utf8");
    };
    await expect(stores.migrateProjectOnDisk(song.id)).rejects.toBeInstanceOf(
      StorageError,
    );
  });
});
