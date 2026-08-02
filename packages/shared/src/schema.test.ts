import { describe, expect, it } from "vitest";
import {
  BatchMidiPcBodySchema,
  ClientHelloMessageSchema,
  CreateProjectBodySchema,
  CueSampleConfigSchema,
  ExportLibraryBodySchema,
  FormaClipSchema,
  HealthResponseSchema,
  LibrarySchema,
  MeterEventSchema,
  MidiHostConfigSchema,
  PROTOCOL_VERSION,
  ProjectIdSchema,
  ProjectSchema,
  ProjectSchemaV2,
  ProjectSchemaV3,
  ProjectSchemaV4,
  ProjectSchemaV5,
  ProjectSchemaV6,
  PutMidiHostConfigBodySchema,
  PutProjectBodySchema,
  PutSetlistBodySchema,
  SetlistSchema,
  StageMessageBodySchema,
  UiHashFileSchema,
  UiManifestSchema,
} from "./schema.js";
import {
  createProjectV2Seed,
  createProjectV3Seed,
  createProjectV4Seed,
  createProjectV5Seed,
  createProjectV6Seed,
  upgradeProjectV2ToV3,
  upgradeProjectV3ToV4,
  upgradeProjectV4ToV5,
  upgradeProjectV5ToV6,
} from "./project-seed.js";

describe("LibrarySchema", () => {
  it("parses a valid catalog", () => {
    const raw = {
      version: 1,
      projects: [
        {
          id: "p1",
          name: "Demo",
          updatedAt: "2026-07-19T12:00:00.000Z",
          midiProgramId: 1,
        },
      ],
    };
    expect(LibrarySchema.parse(raw)).toEqual(raw);
  });

  it("accepts denormalized BPM / key / duration badges", () => {
    const raw = {
      version: 1 as const,
      projects: [
        {
          id: "p1",
          name: "Demo",
          defaultBpm: 120,
          keyLabel: "Am",
          durationMs: 180_000,
        },
      ],
    };
    expect(LibrarySchema.parse(raw)).toEqual(raw);
  });

  it("rejects wrong version", () => {
    expect(() =>
      LibrarySchema.parse({ version: 2, projects: [] }),
    ).toThrow();
  });
});

describe("ProjectSchemaV3", () => {
  it("parses a v3 project seed", () => {
    const raw = createProjectV3Seed(
      "abc",
      "Song",
      "2026-07-19T12:00:00.000Z",
    );
    expect(ProjectSchemaV3.parse(raw)).toEqual(raw);
    expect(raw.formatVersion).toBe(3);
  });

  it("upgrades v2 to v3", () => {
    const v2 = createProjectV2Seed("abc", "Song", "2026-07-19T12:00:00.000Z");
    expect(ProjectSchemaV2.parse(v2).formatVersion).toBe(2);
    const v3 = upgradeProjectV2ToV3(v2);
    expect(ProjectSchemaV3.parse(v3).audioTracks).toEqual([]);
  });
});

describe("ProjectSchemaV4", () => {
  it("parses a v4 project seed", () => {
    const raw = createProjectV4Seed(
      "abc",
      "Song",
      "2026-07-19T12:00:00.000Z",
    );
    expect(ProjectSchemaV4.parse(raw)).toEqual(raw);
    expect(raw.formatVersion).toBe(4);
  });

  it("upgrades v3 to v4", () => {
    const v3 = createProjectV3Seed("abc", "Song", "2026-07-19T12:00:00.000Z");
    const v4 = upgradeProjectV3ToV4(v3);
    expect(ProjectSchemaV4.parse(v4).tekst.clips).toEqual([]);
  });
});

describe("ProjectSchemaV5", () => {
  it("parses a v5 project seed", () => {
    const raw = createProjectV5Seed(
      "abc",
      "Song",
      "2026-07-19T12:00:00.000Z",
    );
    expect(ProjectSchemaV5.parse(raw)).toEqual(raw);
    expect(raw.formatVersion).toBe(5);
    expect(raw.keyMap.length).toBeGreaterThan(0);
    expect(raw.midiProgramId).toBe(0);
  });

  it("rejects unknown keys (strict)", () => {
    const raw = {
      ...createProjectV5Seed("abc", "Song", "2026-07-19T12:00:00.000Z"),
      legacyField: true,
    };
    expect(() => ProjectSchemaV5.parse(raw)).toThrow();
  });

  it("rejects empty name", () => {
    expect(() =>
      ProjectSchemaV5.parse({
        ...createProjectV5Seed("abc", "X", "2026-07-19T12:00:00.000Z"),
        name: "",
      }),
    ).toThrow();
  });

  it("upgrades v4 to v5", () => {
    const v4 = createProjectV4Seed("abc", "Song", "2026-07-19T12:00:00.000Z");
    const v5 = upgradeProjectV4ToV5(v4);
    expect(ProjectSchemaV5.parse(v5).keyMap[0]?.key.tonic).toBe("C");
  });

  it("accepts Cue sample config and rejects stale sample bus / asset", () => {
    expect(
      CueSampleConfigSchema.parse({
        assetId: "a1",
        mode: "gated",
        quantization: "next-beat",
        output: { kind: "bus", busId: "bus-a" },
        playPostStop: true,
      }).mode,
    ).toBe("gated");

    const seed = createProjectV5Seed("abc", "Song", "2026-07-19T12:00:00.000Z");
    const withAsset = {
      ...seed,
      assets: [
        {
          id: "a1",
          storageName: "hit.wav",
          originalName: "hit.wav",
          kind: "audio" as const,
          mimeType: "audio/wav",
          sizeBytes: 100,
        },
      ],
      audioBusses: [{ id: "bus-a", name: "Bus A" }],
      cue: {
        clips: [
          {
            id: "c1",
            startTicks: 0,
            lengthTicks: 960,
            label: "Hit",
            sample: {
              assetId: "a1",
              mode: "one-shot" as const,
              output: { kind: "bus" as const, busId: "bus-a" },
            },
          },
        ],
      },
    };
    expect(ProjectSchemaV5.parse(withAsset).cue.clips[0]?.sample?.assetId).toBe(
      "a1",
    );

    expect(() =>
      ProjectSchemaV5.parse({
        ...withAsset,
        cue: {
          clips: [
            {
              id: "c1",
              startTicks: 0,
              lengthTicks: 960,
              label: "Hit",
              sample: { assetId: "missing" },
            },
          ],
        },
      }),
    ).toThrow(/audio asset/i);

    expect(() =>
      ProjectSchemaV5.parse({
        ...withAsset,
        cue: {
          clips: [
            {
              id: "c1",
              startTicks: 0,
              lengthTicks: 960,
              label: "Hit",
              sample: {
                assetId: "a1",
                output: { kind: "bus", busId: "gone" },
              },
            },
          ],
        },
      }),
    ).toThrow(/busId/i);
  });

  it("rejects template with midiProgramId", () => {
    expect(() =>
      ProjectSchemaV5.parse({
        ...createProjectV5Seed("abc", "Tpl", "2026-07-19T12:00:00.000Z", {
          isTemplate: true,
        }),
        midiProgramId: 1,
      }),
    ).toThrow();
  });

  it("rejects artist longer than 200 chars", () => {
    const seed = createProjectV5Seed("abc", "Song", "2026-07-19T12:00:00.000Z");
    expect(() =>
      ProjectSchemaV5.parse({
        ...seed,
        artist: "x".repeat(201),
      }),
    ).toThrow();
  });
});

describe("ProjectSchemaV6", () => {
  it("parses a v6 project seed", () => {
    const raw = createProjectV6Seed(
      "abc",
      "Song",
      "2026-07-19T12:00:00.000Z",
    );
    expect(ProjectSchema.parse(raw)).toEqual(raw);
    expect(raw.formatVersion).toBe(6);
    expect(raw.melody).toEqual({ clips: [] });
    expect(raw.tekst.clips).toEqual([]);
    expect(raw.keyMap.length).toBeGreaterThan(0);
    expect(raw.midiProgramId).toBe(0);
  });

  it("rejects tekst clip without blocks", () => {
    const seed = createProjectV6Seed(
      "abc",
      "Song",
      "2026-07-19T12:00:00.000Z",
    );
    expect(() =>
      ProjectSchema.parse({
        ...seed,
        tekst: {
          clips: [
            {
              id: "t1",
              startTicks: 0,
              lengthTicks: 960,
              text: "Hello",
            },
          ],
        },
      }),
    ).toThrow();
  });

  it("rejects empty blocks array", () => {
    const seed = createProjectV6Seed(
      "abc",
      "Song",
      "2026-07-19T12:00:00.000Z",
    );
    expect(() =>
      ProjectSchema.parse({
        ...seed,
        tekst: {
          clips: [
            {
              id: "t1",
              startTicks: 0,
              lengthTicks: 960,
              text: "Hello",
              blocks: [],
            },
          ],
        },
      }),
    ).toThrow();
  });

  it("accepts multi-block line and optional role / melody note", () => {
    const seed = createProjectV6Seed(
      "abc",
      "Song",
      "2026-07-19T12:00:00.000Z",
    );
    const raw = {
      ...seed,
      tekst: {
        clips: [
          {
            id: "t1",
            startTicks: 0,
            lengthTicks: 1920,
            text: "Hello world",
            blocks: [
              {
                id: "b1",
                startTicks: 0,
                lengthTicks: 960,
                text: "Hello",
                role: "vocal_1" as const,
              },
              {
                id: "b2",
                startTicks: 960,
                lengthTicks: 960,
                text: "world",
              },
            ],
          },
        ],
      },
      melody: {
        clips: [
          {
            id: "m1",
            startTicks: 0,
            lengthTicks: 480,
            pitchMidi: 60,
          },
        ],
      },
    };
    const parsed = ProjectSchema.parse(raw);
    expect(parsed.tekst.clips[0]?.blocks).toHaveLength(2);
    expect(parsed.tekst.clips[0]?.blocks[0]?.role).toBe("vocal_1");
    expect(parsed.melody.clips[0]?.pitchMidi).toBe(60);
  });

  it("rejects melody pitchMidi out of range", () => {
    const seed = createProjectV6Seed(
      "abc",
      "Song",
      "2026-07-19T12:00:00.000Z",
    );
    expect(() =>
      ProjectSchema.parse({
        ...seed,
        melody: {
          clips: [
            { id: "m1", startTicks: 0, lengthTicks: 480, pitchMidi: 128 },
          ],
        },
      }),
    ).toThrow();
  });

  it("upgrades v5 to v6 with one whole-line block; preserves lanes", () => {
    const v5 = {
      ...createProjectV5Seed("abc", "Song", "2026-07-19T12:00:00.000Z"),
      tekst: {
        clips: [
          {
            id: "line-1",
            startTicks: 100,
            lengthTicks: 2000,
            text: "Whole line",
            sourceSection: "Verse",
          },
        ],
      },
      akordy: {
        clips: [
          {
            id: "a1",
            startTicks: 100,
            lengthTicks: 960,
            symbol: "Am",
          },
        ],
      },
      assets: [
        {
          id: "audio-1",
          storageName: "x.wav",
          originalName: "x.wav",
          kind: "audio" as const,
          mimeType: "audio/wav",
          sizeBytes: 10,
        },
      ],
      audioTracks: [{ id: "tr-1", name: "Stem" }],
      audioClips: [
        {
          id: "ac-1",
          trackId: "tr-1",
          assetId: "audio-1",
          startTicks: 0,
          lengthTicks: 3840,
        },
      ],
    };
    expect(ProjectSchemaV5.parse(v5).formatVersion).toBe(5);

    const v6 = upgradeProjectV5ToV6(v5);
    const parsed = ProjectSchemaV6.parse(v6);
    expect(parsed.formatVersion).toBe(6);
    expect(parsed.melody).toEqual({ clips: [] });
    expect(parsed.tekst.clips).toHaveLength(1);
    expect(parsed.tekst.clips[0]).toEqual({
      id: "line-1",
      startTicks: 100,
      lengthTicks: 2000,
      text: "Whole line",
      sourceSection: "Verse",
      blocks: [
        {
          id: "line-1-block-0",
          startTicks: 100,
          lengthTicks: 2000,
          text: "Whole line",
        },
      ],
    });
    expect(parsed.akordy.clips).toEqual(v5.akordy.clips);
    expect(parsed.audioClips).toEqual(v5.audioClips);
    expect(parsed.assets).toEqual(v5.assets);
    expect(parsed.name).toBe("Song");
    expect(parsed.keyMap).toEqual(v5.keyMap);
  });

  it("rejects unknown keys (strict)", () => {
    const raw = {
      ...createProjectV6Seed("abc", "Song", "2026-07-19T12:00:00.000Z"),
      legacyField: true,
    };
    expect(() => ProjectSchemaV6.parse(raw)).toThrow();
  });

  it("rejects empty name", () => {
    expect(() =>
      ProjectSchema.parse({
        ...createProjectV6Seed("abc", "X", "2026-07-19T12:00:00.000Z"),
        name: "",
      }),
    ).toThrow();
  });

  it("accepts Cue sample config and rejects stale sample bus / asset", () => {
    const seed = createProjectV6Seed("abc", "Song", "2026-07-19T12:00:00.000Z");
    const withAsset = {
      ...seed,
      assets: [
        {
          id: "a1",
          storageName: "hit.wav",
          originalName: "hit.wav",
          kind: "audio" as const,
          mimeType: "audio/wav",
          sizeBytes: 100,
        },
      ],
      audioBusses: [{ id: "bus-a", name: "Bus A" }],
      cue: {
        clips: [
          {
            id: "c1",
            startTicks: 0,
            lengthTicks: 960,
            label: "Hit",
            sample: {
              assetId: "a1",
              mode: "one-shot" as const,
              output: { kind: "bus" as const, busId: "bus-a" },
            },
          },
        ],
      },
    };
    expect(ProjectSchema.parse(withAsset).cue.clips[0]?.sample?.assetId).toBe(
      "a1",
    );

    expect(() =>
      ProjectSchema.parse({
        ...withAsset,
        cue: {
          clips: [
            {
              id: "c1",
              startTicks: 0,
              lengthTicks: 960,
              label: "Hit",
              sample: { assetId: "missing" },
            },
          ],
        },
      }),
    ).toThrow(/audio asset/i);
  });
});

describe("CreateProjectBodySchema", () => {
  it("requires a non-empty name", () => {
    expect(CreateProjectBodySchema.parse({ name: "New" })).toEqual({
      name: "New",
    });
    expect(() => CreateProjectBodySchema.parse({ name: "" })).toThrow();
    expect(() => CreateProjectBodySchema.parse({})).toThrow();
  });

  it("rejects names longer than 200 chars", () => {
    expect(() =>
      CreateProjectBodySchema.parse({ name: "x".repeat(201) }),
    ).toThrow();
  });

  it("rejects whitespace-only name, unknown keys; keeps optional flags", () => {
    expect(() => CreateProjectBodySchema.parse({ name: "   " })).toThrow();
    expect(() =>
      CreateProjectBodySchema.parse({ name: "Ok", extra: true }),
    ).toThrow();
    expect(
      CreateProjectBodySchema.parse({
        name: " From tpl ",
        fromTemplateId: "tpl-1",
        isTemplate: true,
      }),
    ).toEqual({
      name: "From tpl",
      fromTemplateId: "tpl-1",
      isTemplate: true,
    });
  });
});

describe("ClientHelloMessageSchema", () => {
  it("accepts minimal hello and optional fields", () => {
    expect(ClientHelloMessageSchema.parse({ type: "client_hello" })).toEqual({
      type: "client_hello",
    });
    expect(
      ClientHelloMessageSchema.parse({
        type: "client_hello",
        displayName: "Pad",
        roles: ["karaoke", "grid"],
        latencyMs: 12.5,
      }),
    ).toMatchObject({
      displayName: "Pad",
      roles: ["karaoke", "grid"],
      latencyMs: 12.5,
    });
  });

  it("rejects bad type, roles, latency, and unknown keys", () => {
    expect(() =>
      ClientHelloMessageSchema.parse({ type: "hello" }),
    ).toThrow();
    expect(() =>
      ClientHelloMessageSchema.parse({
        type: "client_hello",
        roles: ["karaoke", "grid", "score"],
      }),
    ).toThrow();
    expect(() =>
      ClientHelloMessageSchema.parse({
        type: "client_hello",
        roles: ["admin"],
      }),
    ).toThrow();
    expect(() =>
      ClientHelloMessageSchema.parse({
        type: "client_hello",
        latencyMs: Number.NaN,
      }),
    ).toThrow();
    expect(() =>
      ClientHelloMessageSchema.parse({
        type: "client_hello",
        latencyMs: -1,
      }),
    ).toThrow();
    expect(() =>
      ClientHelloMessageSchema.parse({ type: "client_hello", extra: 1 }),
    ).toThrow();
  });
});

describe("PutProjectBodySchema", () => {
  it("parses full v6 body without id (keeps updatedAt for OCC)", () => {
    const full = createProjectV6Seed("abc", "Song", "2026-07-19T12:00:00.000Z");
    const { id, ...body } = full;
    void id;
    const parsed = PutProjectBodySchema.parse(body);
    expect(parsed.name).toBe("Song");
    expect(parsed.updatedAt).toBe("2026-07-19T12:00:00.000Z");
    expect(parsed.formatVersion).toBe(6);
    expect(parsed.melody).toEqual({ clips: [] });
  });

  it("rejects unknown keys", () => {
    const full = createProjectV6Seed("abc", "Song", "2026-07-19T12:00:00.000Z");
    const { id, ...body } = full;
    void id;
    expect(() =>
      PutProjectBodySchema.parse({ ...body, extra: 1 }),
    ).toThrow();
  });

  it("rejects stale audio bus output on PUT body", () => {
    const full = createProjectV6Seed("abc", "Song", "2026-07-19T12:00:00.000Z");
    const { id, ...body } = full;
    void id;
    const bad = {
      ...body,
      audioTracks: [
        {
          id: "t1",
          name: "Track 1",
          output: { kind: "bus" as const, busId: "ghost-bus" },
        },
      ],
    };
    expect(() => PutProjectBodySchema.parse(bad)).toThrow(/busId not found/i);
  });
});

describe("MeterEventSchema edges", () => {
  it("rejects invalid meter for PPQ", () => {
    expect(() =>
      MeterEventSchema.parse({
        id: "m2",
        startTicks: 0,
        numerator: 5,
        denominator: 7,
      }),
    ).toThrow();
  });
});

describe("FormaClipSchema", () => {
  it("allows negative startTicks for countdown; section may be negative int", () => {
    expect(
      FormaClipSchema.parse({
        id: "cd",
        name: "CD",
        startTicks: -3840,
        lengthTicks: 3840,
        kind: "countdown",
      }).kind,
    ).toBe("countdown");
    expect(
      FormaClipSchema.parse({
        id: "sec",
        name: "Verse",
        startTicks: -1,
        lengthTicks: 3840,
        kind: "section",
      }).startTicks,
    ).toBe(-1);
  });
});

describe("StageMessageBodySchema", () => {
  it("accepts ttlMs within 24h", () => {
    expect(
      StageMessageBodySchema.parse({ text: "Go!", ttlMs: 10_000 }),
    ).toEqual({ text: "Go!", ttlMs: 10_000 });
  });

  it("rejects ttlMs above 24h and negative", () => {
    expect(() =>
      StageMessageBodySchema.parse({ text: "Go!", ttlMs: 86_400_001 }),
    ).toThrow();
    expect(() =>
      StageMessageBodySchema.parse({ text: "Go!", ttlMs: -1 }),
    ).toThrow();
  });

  it("accepts ttlMs 0 as infinite and optional priority", () => {
    expect(
      StageMessageBodySchema.parse({
        text: "Hold",
        ttlMs: 0,
        priority: "alert",
      }),
    ).toEqual({ text: "Hold", ttlMs: 0, priority: "alert" });
  });

  it("rejects empty text and unknown priority", () => {
    expect(() => StageMessageBodySchema.parse({ text: "" })).toThrow();
    expect(() =>
      StageMessageBodySchema.parse({ text: "X", priority: "urgent" }),
    ).toThrow();
  });
});

describe("ProjectIdSchema", () => {
  it("accepts UUID and rejects non-uuid", () => {
    expect(
      ProjectIdSchema.parse("11111111-1111-4111-8111-111111111111"),
    ).toBe("11111111-1111-4111-8111-111111111111");
    expect(() => ProjectIdSchema.parse("not-a-uuid")).toThrow();
    expect(() => ProjectIdSchema.parse("../escape")).toThrow();
  });
});

describe("DefaultMeter refine + Setlist coerce", () => {
  it("rejects meters that yield non-integer ticksPerBar", () => {
    const seed = createProjectV5Seed("abc", "Song", "2026-07-19T12:00:00.000Z");
    expect(() =>
      ProjectSchemaV5.parse({
        ...seed,
        defaultMeter: { numerator: 5, denominator: 7 },
      }),
    ).toThrow();
  });

  it("SetlistSchema coerces projectIds ↔ items", () => {
    const fromIds = SetlistSchema.parse({
      version: 1,
      enabled: true,
      projectIds: ["11111111-1111-4111-8111-111111111111"],
      autoAdvance: { enabled: false },
      timeBudgetMinutes: 60,
    });
    expect(fromIds.items).toEqual([
      {
        type: "project",
        projectId: "11111111-1111-4111-8111-111111111111",
      },
    ]);

    const fromItems = SetlistSchema.parse({
      version: 1,
      enabled: true,
      items: [
        {
          type: "project",
          projectId: "11111111-1111-4111-8111-111111111111",
        },
        {
          type: "break",
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          label: "Break",
          durationMinutes: 5,
        },
      ],
      autoAdvance: { enabled: false },
      timeBudgetMinutes: 60,
    });
    expect(fromItems.projectIds).toEqual([
      "11111111-1111-4111-8111-111111111111",
    ]);
  });

  it("PutSetlistBodySchema requires items or projectIds", () => {
    expect(() =>
      PutSetlistBodySchema.parse({ enabled: true }),
    ).toThrow(/Provide items or projectIds/);
    expect(
      PutSetlistBodySchema.parse({
        enabled: true,
        projectIds: ["11111111-1111-4111-8111-111111111111"],
      }).projectIds,
    ).toHaveLength(1);
  });

  it("SetlistSchema keeps object when both items and projectIds present", () => {
    const both = SetlistSchema.parse({
      version: 1,
      enabled: true,
      items: [
        {
          type: "project",
          projectId: "11111111-1111-4111-8111-111111111111",
        },
      ],
      projectIds: ["11111111-1111-4111-8111-111111111111"],
      autoAdvance: { enabled: false },
      timeBudgetMinutes: 60,
    });
    expect(both.items).toHaveLength(1);
    expect(both.projectIds).toHaveLength(1);
  });

  it("normalizeKeyTonic validates and falls back", async () => {
    const { normalizeKeyTonic } = await import("./schema.js");
    expect(normalizeKeyTonic("G")).toBe("G");
    expect(normalizeKeyTonic("nope", "D")).toBe("D");
    expect(normalizeKeyTonic(1)).toBe("C");
  });

  it("BatchMidiPcBodySchema accepts assignments and rejects out-of-range PC", () => {
    expect(
      BatchMidiPcBodySchema.parse({
        assignments: [{ id: "p1", midiProgramId: 0 }],
      }).assignments,
    ).toHaveLength(1);
    expect(() =>
      BatchMidiPcBodySchema.parse({
        assignments: [{ id: "p1", midiProgramId: 128 }],
      }),
    ).toThrow();
    expect(() => BatchMidiPcBodySchema.parse({ assignments: "x" })).toThrow();
  });

  it("ExportLibraryBodySchema requires UUID projectIds when present", () => {
    expect(ExportLibraryBodySchema.parse({})).toEqual({});
    expect(
      ExportLibraryBodySchema.parse({
        projectIds: ["11111111-1111-4111-8111-111111111111"],
      }).projectIds,
    ).toHaveLength(1);
    expect(() =>
      ExportLibraryBodySchema.parse({ projectIds: ["not-a-uuid"] }),
    ).toThrow();
  });

  it("PutMidiHostConfigBodySchema is partial and strict", () => {
    expect(PutMidiHostConfigBodySchema.parse({})).toEqual({});
    expect(
      PutMidiHostConfigBodySchema.parse({
        inputId: null,
        clockOutEnabled: true,
        inputChannel: 3,
        outputChannel: 5,
      }),
    ).toEqual({
      inputId: null,
      clockOutEnabled: true,
      inputChannel: 3,
      outputChannel: 5,
    });
    expect(() =>
      PutMidiHostConfigBodySchema.parse({ inputId: "" }),
    ).toThrow();
    expect(() =>
      PutMidiHostConfigBodySchema.parse({ extra: true }),
    ).toThrow();
    expect(() =>
      PutMidiHostConfigBodySchema.parse({ inputChannel: 16 }),
    ).toThrow();
    expect(() =>
      PutMidiHostConfigBodySchema.parse({ outputChannel: -1 }),
    ).toThrow();
  });

  it("MidiHostConfigSchema defaults missing channels (legacy files)", () => {
    expect(
      MidiHostConfigSchema.parse({
        inputId: null,
        outputId: null,
        clockOutEnabled: true,
      }),
    ).toEqual({
      inputId: null,
      outputId: null,
      clockOutEnabled: true,
      inputChannel: null,
      outputChannel: 0,
    });
  });
});

describe("HealthResponseSchema + UI meta (#692)", () => {
  it("parses health with optional hostname", () => {
    const raw = {
      ok: true as const,
      service: "stagesync-server" as const,
      version: "5.3.0",
      protocolVersion: PROTOCOL_VERSION,
      uiHash: "abc123",
      hostname: "FOH Mac Mini",
    };
    expect(HealthResponseSchema.parse(raw)).toEqual(raw);
  });

  it("parses health with protocolVersion and uiHash", () => {
    const raw = {
      ok: true as const,
      service: "stagesync-server" as const,
      version: "5.1.3",
      protocolVersion: PROTOCOL_VERSION,
      uiHash: "abc123",
    };
    expect(HealthResponseSchema.parse(raw)).toEqual(raw);
  });

  it("parses health with additive role ui hashes", () => {
    const raw = {
      ok: true as const,
      service: "stagesync-server" as const,
      version: "5.1.3",
      protocolVersion: PROTOCOL_VERSION,
      uiHash: "full",
      uiHashPerformer: "perf",
      uiHashConsole: "cons",
    };
    expect(HealthResponseSchema.parse(raw)).toEqual(raw);
  });

  it("parses optional themeDefault", () => {
    expect(
      HealthResponseSchema.parse({
        ok: true,
        service: "stagesync-server",
        version: "5.2.0",
        protocolVersion: PROTOCOL_VERSION,
        uiHash: "x",
        themeDefault: "light-high",
      }).themeDefault,
    ).toBe("daylight");
  });

  it("rejects health missing uiHash (strict)", () => {
    expect(() =>
      HealthResponseSchema.parse({
        ok: true,
        service: "stagesync-server",
        version: "5.1.3",
        protocolVersion: 1,
      }),
    ).toThrow();
  });

  it("rejects unknown health keys", () => {
    expect(() =>
      HealthResponseSchema.parse({
        ok: true,
        service: "stagesync-server",
        version: "5.1.3",
        protocolVersion: 1,
        uiHash: "x",
        extra: true,
      }),
    ).toThrow();
  });

  it("parses ui-hash.json and ui-manifest", () => {
    expect(
      UiHashFileSchema.parse({
        protocolVersion: PROTOCOL_VERSION,
        uiHash: "deadbeef",
      }),
    ).toEqual({ protocolVersion: 1, uiHash: "deadbeef" });

    const manifest = {
      protocolVersion: PROTOCOL_VERSION,
      uiHash: "deadbeef",
      assets: [{ path: "/index.html", hash: "aa", size: 12 }],
    };
    expect(UiManifestSchema.parse(manifest)).toEqual(manifest);
  });
});
