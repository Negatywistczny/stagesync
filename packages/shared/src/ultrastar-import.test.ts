import { describe, expect, it } from "vitest";
import { createProjectSeed } from "./project-seed.js";
import { ProjectSchema } from "./schema.js";
import { DEFAULT_PPQ, elapsedToTicks } from "./time.js";
import {
  applyUltrastarImportToProject,
  importUltrastarText,
  ticksPerUltrastarBeat,
  ultrastarBeatToTicks,
  ultrastarHeaderBpmToMetronome,
} from "./ultrastar-import.js";

const METER = { numerator: 4, denominator: 4 } as const;

describe("ultrastar BPM ×4", () => {
  it("maps header BPM to metronome BPM", () => {
    expect(ultrastarHeaderBpmToMetronome(320)).toBe(80);
    expect(ultrastarHeaderBpmToMetronome(400)).toBe(100);
  });

  it("uses one sixteenth per UltraStar beat at DEFAULT_PPQ", () => {
    expect(ticksPerUltrastarBeat(DEFAULT_PPQ)).toBe(DEFAULT_PPQ / 4);
  });
});

describe("importUltrastarText", () => {
  const simple = `#TITLE:Demo Song
#ARTIST:Demo Artist
#BPM:320
#GAP:1000
: 0 4 0 Hel
: 4 4 2 lo
- 
: 16 4 4 World
E
`;

  it("parses syllables into timed blocks and melody", () => {
    const r = importUltrastarText(simple);
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.title).toBe("Demo Song");
    expect(r.artist).toBe("Demo Artist");
    expect(r.ultrastarBpm).toBe(320);
    expect(r.metronomeBpm).toBe(80);
    expect(r.gapMs).toBe(1000);
    expect(r.syllableCount).toBe(3);
    expect(r.tekst.clips).toHaveLength(2);

    const gapTicks = elapsedToTicks(1000, 80, METER, DEFAULT_PPQ);
    expect(r.tekst.clips[0]!.blocks[0]!.startTicks).toBe(
      ultrastarBeatToTicks(0, gapTicks),
    );
    expect(r.tekst.clips[0]!.text).toBe("Hello");
    expect(r.tekst.clips[0]!.blocks).toHaveLength(2);
    expect(r.tekst.clips[1]!.text).toBe("World");

    expect(r.melody.clips).toHaveLength(3);
    expect(r.melody.clips[0]!.pitchMidi).toBe(60);
    expect(r.melody.clips[1]!.pitchMidi).toBe(62);

    expect(ProjectSchema.parse({
      ...createProjectSeed("p1", "x", "2026-08-02T12:00:00.000Z"),
      tekst: r.tekst,
      melody: r.melody,
      defaultBpm: r.metronomeBpm,
    }).formatVersion).toBe(6);
  });

  it("assigns vocal roles for duet #P1/#P2", () => {
    const duet = `#TITLE:Duet
#BPM:400
#GAP:0
#P1
: 0 4 0 You
-
#P2
: 8 4 0 Me
E
`;
    const r = importUltrastarText(duet);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.tekst.clips[0]!.blocks[0]!.role).toBe("vocal_1");
    expect(r.tekst.clips[1]!.blocks[0]!.role).toBe("vocal_2");
  });

  it("rejects missing BPM", () => {
    const r = importUltrastarText(`#TITLE:X\n: 0 4 0 Hi\nE\n`);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toMatch(/BPM/i);
  });

  it("rejects empty input", () => {
    expect(importUltrastarText("").ok).toBe(false);
  });
});

describe("applyUltrastarImportToProject", () => {
  it("replaces tekst and melody and sets BPM/name", () => {
    const imported = importUltrastarText(`#TITLE:Imported
#ARTIST:Band
#BPM:400
#GAP:0
: 0 4 0 Hi
E
`);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;

    const base = createProjectSeed("p1", "Old", "2026-08-02T12:00:00.000Z");
    const next = applyUltrastarImportToProject(base, imported);
    expect(next.name).toBe("Imported");
    expect(next.artist).toBe("Band");
    expect(next.defaultBpm).toBe(100);
    expect(next.tekst.clips).toHaveLength(1);
    expect(next.melody.clips).toHaveLength(1);
    expect(next.akordy.clips).toEqual(base.akordy.clips);
    expect(ProjectSchema.parse(next).formatVersion).toBe(6);
  });
});
