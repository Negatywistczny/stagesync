import { describe, expect, it } from "vitest";
import { createProjectSeed } from "./project-seed.js";
import { ProjectSchema } from "./schema.js";
import { DEFAULT_PPQ, elapsedToTicks, ticksToMs } from "./time.js";
import {
  applyUltrastarImportToProject,
  groupUltrastarSyllablesIntoWords,
  importUltrastarText,
  parseUltrastarNoteLine,
  suggestGridBpmFromPipeAndFirstVocal,
  ticksPerUltrastarBeat,
  ultrastarBeatToMs,
  ultrastarBeatToTicks,
  ultrastarHeaderBpmToMetronome,
  ultrastarLineTextFromRawLyrics,
  ultrastarLyricEndsWord,
} from "./ultrastar-import.js";

const METER = { numerator: 4, denominator: 4 } as const;

describe("ultrastar BPM ×4", () => {
  it("maps header BPM to metronome BPM", () => {
    expect(ultrastarHeaderBpmToMetronome(320)).toBe(80);
    expect(ultrastarHeaderBpmToMetronome(400)).toBe(100);
    expect(ultrastarHeaderBpmToMetronome(480)).toBe(120);
  });

  it("uses one 64th per UltraStar beat at DEFAULT_PPQ (USDX BPM×4)", () => {
    // t = beat × 60 / (BPM_header × 4); metro = header/4 → beat = ppq/16
    expect(ticksPerUltrastarBeat(DEFAULT_PPQ)).toBe(DEFAULT_PPQ / 16);
  });
});

describe("UltraStar word boundaries (trailing space)", () => {
  it("preserves trailing space on note lyric parse", () => {
    const n = parseUltrastarNoteLine(": 10 4 5 About ");
    expect(n).not.toBeNull();
    expect(n!.text).toBe("About ");
    expect(ultrastarLyricEndsWord(n!.text)).toBe(true);
  });

  it("About + thin → two words", () => {
    const words = groupUltrastarSyllablesIntoWords([
      { text: "About ", startBeat: 0, lengthBeat: 4, pitch: 0 },
      { text: "thin ", startBeat: 4, lengthBeat: 4, pitch: 0 },
    ]);
    expect(words.map((w) => w.text)).toEqual(["About", "thin"]);
    expect(words[0]!.syllables).toHaveLength(1);
    expect(words[1]!.syllables).toHaveLength(1);
  });

  it("A + bout → one word About with 2 syllables", () => {
    const words = groupUltrastarSyllablesIntoWords([
      { text: "A", startBeat: 0, lengthBeat: 2, pitch: 0 },
      { text: "bout ", startBeat: 2, lengthBeat: 2, pitch: 0 },
    ]);
    expect(words).toHaveLength(1);
    expect(words[0]!.text).toBe("About");
    expect(words[0]!.syllables.map((s) => s.text)).toEqual(["A", "bout"]);
  });

  it("leading space also opens a new word (USDX)", () => {
    const words = groupUltrastarSyllablesIntoWords([
      { text: "Hello", startBeat: 0, lengthBeat: 4, pitch: 0 },
      { text: " World", startBeat: 4, lengthBeat: 4, pitch: 0 },
    ]);
    expect(words.map((w) => w.text)).toEqual(["Hello", "World"]);
  });

  it("line text joins with word gaps, not glued", () => {
    expect(ultrastarLineTextFromRawLyrics(["About ", "thin "])).toBe(
      "About thin",
    );
    expect(ultrastarLineTextFromRawLyrics(["A", "bout ", "time "])).toBe(
      "About time",
    );
  });
});

describe("UltraStar melisma ~", () => {
  it("strips ~ from display and line text; keeps one word Conversation", () => {
    const words = groupUltrastarSyllablesIntoWords([
      { text: "Con", startBeat: 0, lengthBeat: 2, pitch: 0 },
      { text: "ver", startBeat: 2, lengthBeat: 2, pitch: 0 },
      { text: "sa", startBeat: 4, lengthBeat: 2, pitch: 0 },
      { text: "~", startBeat: 6, lengthBeat: 2, pitch: 0 },
      { text: "~", startBeat: 8, lengthBeat: 2, pitch: 0 },
      { text: "tion ", startBeat: 10, lengthBeat: 2, pitch: 0 },
    ]);
    expect(words).toHaveLength(1);
    expect(words[0]!.text).toBe("Conversation");
    expect(words[0]!.syllables.map((s) => s.text)).toEqual([
      "Con",
      "ver",
      "sa",
      "tion",
    ]);
    expect(
      ultrastarLineTextFromRawLyrics([
        "Con",
        "ver",
        "sa",
        "~",
        "~",
        "tion ",
      ]),
    ).toBe("Conversation");
  });

  it("~ with trailing space ends the word", () => {
    expect(ultrastarLyricEndsWord("~ ")).toBe(true);
    const words = groupUltrastarSyllablesIntoWords([
      { text: "Hi", startBeat: 0, lengthBeat: 2, pitch: 0 },
      { text: "~ ", startBeat: 2, lengthBeat: 2, pitch: 0 },
      { text: "there ", startBeat: 4, lengthBeat: 2, pitch: 0 },
    ]);
    expect(words.map((w) => w.text)).toEqual(["Hi", "there"]);
  });

  it("import attaches word gap after ~  onto previous syllable block", () => {
    const src = `#TITLE:Gap
#BPM:400
#GAP:0
: 0 2 0 Hi
: 2 2 1 ~ 
: 4 2 0 there 
E
`;
    const r = importUltrastarText(src);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.tekst.clips[0]!.text).toBe("Hi there");
    expect(r.tekst.clips[0]!.blocks.map((b) => b.text)).toEqual([
      "Hi ",
      "there ",
    ]);
  });

  it("import skips ~ tekst blocks but keeps melody notes", () => {
    const src = `#TITLE:Melisma
#BPM:400
#GAP:0
: 0 2 0 Con
: 2 2 0 ver
: 4 2 0 sa
: 6 2 1 ~
: 8 2 2 ~
: 10 2 0 tion 
E
`;
    const r = importUltrastarText(src);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.tekst.clips[0]!.text).toBe("Conversation");
    expect(r.tekst.clips[0]!.blocks.map((b) => b.text)).toEqual([
      "Con",
      "ver",
      "sa",
      "tion ",
    ]);
    expect(r.syllableCount).toBe(4);
    expect(r.melody.clips).toHaveLength(6);
    expect(r.noteCount).toBe(6);
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

  it("parses syllables into timed line blocks and melody", () => {
    const r = importUltrastarText(simple);
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.title).toBe("Demo Song");
    expect(r.artist).toBe("Demo Artist");
    expect(r.ultrastarBpm).toBe(320);
    expect(r.metronomeBpm).toBe(80);
    expect(r.ultrastarMetronomeBpm).toBe(80);
    expect(r.gapMs).toBe(1000);
    expect(r.firstVocalMs).toBe(1000);
    expect(r.syllableCount).toBe(3);
    expect(r.tekst.clips).toHaveLength(2);

    const gapTicks = elapsedToTicks(1000, 80, METER, DEFAULT_PPQ);
    expect(r.tekst.clips[0]!.blocks[0]!.startTicks).toBe(
      ultrastarBeatToTicks(0, gapTicks),
    );
    expect(r.tekst.clips[0]!.text).toBe("Hello");
    expect(r.tekst.clips[0]!.blocks).toHaveLength(2);
    expect(r.tekst.clips[0]!.blocks.map((b) => b.text)).toEqual(["Hel", "lo "]);
    expect(r.tekst.clips[1]!.text).toBe("World");
    expect(r.tekst.clips[1]!.blocks.map((b) => b.text)).toEqual(["World "]);

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

  it("does not glue words when trailing spaces mark boundaries", () => {
    const src = `#TITLE:Words
#BPM:400
#GAP:0
: 0 4 0 About 
: 4 4 0 thin 
-
: 16 2 0 A
: 18 2 0 bout 
E
`;
    const r = importUltrastarText(src);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.tekst.clips[0]!.text).toBe("About thin");
    expect(r.tekst.clips[0]!.blocks.map((b) => b.text)).toEqual([
      "About ",
      "thin ",
    ]);
    expect(r.tekst.clips[1]!.text).toBe("About");
    expect(r.tekst.clips[1]!.blocks.map((b) => b.text)).toEqual(["A", "bout "]);
    expect(r.wordCount).toBe(3);
  });

  it("shifts first syllable by #GAP:12500 at metronome BPM", () => {
    const src = `#TITLE:Gap
#BPM:480
#GAP:12500
: 0 4 0 Hi 
E
`;
    const r = importUltrastarText(src);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.metronomeBpm).toBe(120);
    const gapTicks = elapsedToTicks(12500, 120, METER, DEFAULT_PPQ);
    expect(gapTicks).toBeGreaterThan(0);
    expect(r.tekst.clips[0]!.blocks[0]!.startTicks).toBe(
      ultrastarBeatToTicks(0, gapTicks),
    );
    expect(r.tekst.clips[0]!.startTicks).toBe(gapTicks);
  });

  it("keeps later phrases on absolute USDX beats (no ×4 stretch)", () => {
    // USDX: t_ms = GAP + beat × 60000 / (BPM × 4). Wrong ppq/4 scaled later
    // phrases ~4× late while beat 0 + GAP still looked fine.
    const src = `#TITLE:MultiPhrase
#BPM:400
#GAP:1000
: 0 4 0 One 
-
: 64 4 0 Two 
-
: 256 4 0 Three 
E
`;
    const r = importUltrastarText(src);
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const metro = 100;
    const gapTicks = elapsedToTicks(1000, metro, METER, DEFAULT_PPQ);
    const tpUb = ticksPerUltrastarBeat(DEFAULT_PPQ);
    expect(tpUb).toBe(DEFAULT_PPQ / 16);

    expect(r.tekst.clips).toHaveLength(3);
    expect(r.tekst.clips[0]!.startTicks).toBe(gapTicks);
    expect(r.tekst.clips[1]!.startTicks).toBe(gapTicks + Math.round(64 * tpUb));
    expect(r.tekst.clips[2]!.startTicks).toBe(gapTicks + Math.round(256 * tpUb));

    // Inter-phrase tick gaps must track absolute beat deltas (64, 192) — not ×4.
    expect(r.tekst.clips[1]!.startTicks - r.tekst.clips[0]!.startTicks).toBe(
      Math.round(64 * tpUb),
    );
    expect(r.tekst.clips[2]!.startTicks - r.tekst.clips[1]!.startTicks).toBe(
      Math.round(192 * tpUb),
    );

    // Wall-clock vs USDX formula (issue: 10 beats @ BPM 120 → 1.25s).
    const wall2 = ticksToMs(r.tekst.clips[1]!.startTicks, metro, METER, DEFAULT_PPQ);
    const usdx2 = 1000 + (64 * 60_000) / (400 * 4);
    expect(Math.abs(wall2 - usdx2)).toBeLessThan(1);

    const wall3 = ticksToMs(r.tekst.clips[2]!.startTicks, metro, METER, DEFAULT_PPQ);
    const usdx3 = 1000 + (256 * 60_000) / (400 * 4);
    expect(Math.abs(wall3 - usdx3)).toBeLessThan(1);
  });

  it("matches USDX note duration (BPM 120, 10 beats → 1.25s)", () => {
    const src = `#TITLE:EmptyTitle
#BPM:120
#GAP:1000
: 0 10 5 bla
E
`;
    const r = importUltrastarText(src);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const metro = 30;
    expect(r.metronomeBpm).toBe(metro);
    const durMs = ticksToMs(
      r.melody.clips[0]!.lengthTicks,
      metro,
      METER,
      DEFAULT_PPQ,
    );
    expect(Math.abs(durMs - 1250)).toBeLessThan(1);
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

  it("parses #MP3 and #VIDEO headers", () => {
    const src = `#TITLE:Video
#ARTIST:Band
#BPM:400
#GAP:0
#MP3:song.mp3
#VIDEO:https://www.youtube.com/watch?v=dQw4w9WgXcQ
: 0 4 0 Hi 
E
`;
    const r = importUltrastarText(src);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.mp3Hint).toBe("song.mp3");
    expect(r.videoUrl).toContain("youtube.com");
    expect(r.youtubeVideoId).toBe("dQw4w9WgXcQ");
  });

  it("parses bare YouTube id in #VIDEO", () => {
    const src = `#TITLE:X
#BPM:400
#GAP:0
#VIDEO:dQw4w9WgXcQ
: 0 4 0 Hi 
E
`;
    const r = importUltrastarText(src);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.youtubeVideoId).toBe("dQw4w9WgXcQ");
  });
});

describe("applyUltrastarImportToProject", () => {
  it("replaces tekst and melody; leaves Forma unchanged", () => {
    const imported = importUltrastarText(`#TITLE:Imported
#ARTIST:Band
#BPM:400
#GAP:0
: 0 4 0 Hi 
-
: 8 4 0 There 
E
`);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;

    const base = createProjectSeed("p1", "Old", "2026-08-02T12:00:00.000Z");
    const next = applyUltrastarImportToProject(base, imported);
    expect(next.name).toBe("Imported");
    expect(next.artist).toBe("Band");
    expect(next.defaultBpm).toBe(120);
    expect(next.tempoMap[0]!.bpm).toBe(120);
    expect(next.tekst.clips).toHaveLength(2);
    expect(next.melody.clips).toHaveLength(2);
    expect(next.akordy.clips).toEqual(base.akordy.clips);
    expect(next.forma.clips).toEqual(base.forma.clips);
    expect(ProjectSchema.parse(next).formatVersion).toBe(6);
  });

  it("leaves existing project tempoMap unchanged (UltraStar #BPM is decode-only)", () => {
    const imported = importUltrastarText(`#TITLE:Africa
#BPM:369.2
#GAP:23300
: 0 4 0 Hi 
E
`);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;

    const base = createProjectSeed("p1", "Old", "2026-08-02T12:00:00.000Z");
    expect(base.tempoMap[0]!.bpm).toBe(120);
    const next = applyUltrastarImportToProject(base, imported);
    expect(next.defaultBpm).toBe(120);
    expect(next.tempoMap).toHaveLength(1);
    expect(next.tempoMap[0]!.startTicks).toBe(0);
    expect(next.tempoMap[0]!.bpm).toBe(120);
    expect(next.tekst.clips.length).toBeGreaterThan(0);
  });
});

describe("wall-clock + editorial grid BPM", () => {
  it("ultrastarBeatToMs matches USDX formula", () => {
    expect(ultrastarBeatToMs(0, 33000, 339.36)).toBe(33000);
    // beat 16 @ header 480 → 16 × 60000 / (480×4) = 500 ms after GAP
    expect(ultrastarBeatToMs(16, 0, 480)).toBe(500);
  });

  it("suggestGridBpmFromPipeAndFirstVocal locks pipe + pickup to first vocal", () => {
    // 16 bars + 0.5 pickup @ 33s → 120 BPM (Beat 1 at file 0)
    expect(
      suggestGridBpmFromPipeAndFirstVocal({
        pipeBarCount: 16,
        firstVocalMs: 33000,
      }),
    ).toBe(120);
    expect(
      suggestGridBpmFromPipeAndFirstVocal({
        pipeBarCount: 0,
        firstVocalMs: 33000,
      }),
    ).toBeNull();
  });

  it("suggestGridBpmFromPipeAndFirstVocal is content-relative to Beat 1", () => {
    // SingStar-style GAP 35140 with Beat 1 @ 2140 → same 16.5 bars @ 120
    expect(
      suggestGridBpmFromPipeAndFirstVocal({
        pipeBarCount: 16,
        firstVocalMs: 35140,
        beat1Ms: 2140,
      }),
    ).toBe(120);
    // Absolute GAP without Beat 1 underestimates (~113) — callers must pass beat1
    expect(
      suggestGridBpmFromPipeAndFirstVocal({
        pipeBarCount: 16,
        firstVocalMs: 35140,
        beat1Ms: 0,
      }),
    ).toBeCloseTo(112.69, 1);
    // trimIn ~3014 → ~123 (Logic Adapt band)
    expect(
      suggestGridBpmFromPipeAndFirstVocal({
        pipeBarCount: 16,
        firstVocalMs: 35140,
        beat1Ms: 3014,
      }),
    ).toBeCloseTo(123.3, 0);
  });

  it("gridBpm override keeps wall-clock onsets (no beat-lock drift)", () => {
    const src = `#TITLE:Grid
#BPM:339.36
#GAP:33000
: 0 4 0 Hi 
: 16 4 0 Yo 
E
`;
    const file = importUltrastarText(src);
    const grid = importUltrastarText(src, { gridBpm: 120 });
    expect(file.ok && grid.ok).toBe(true);
    if (!file.ok || !grid.ok) return;
    expect(file.metronomeBpm).toBeCloseTo(84.84, 1);
    expect(grid.metronomeBpm).toBe(120);
    expect(grid.tekst.clips[0]!.startTicks).toBe(
      elapsedToTicks(33000, 120, METER, DEFAULT_PPQ),
    );
    // Second note: same wall-clock at both BPMs when converted back
    const yoMs = ultrastarBeatToMs(16, 33000, 339.36);
    expect(grid.melody.clips[1]!.startTicks).toBe(
      elapsedToTicks(yoMs, 120, METER, DEFAULT_PPQ),
    );
    expect(file.melody.clips[1]!.startTicks).toBe(
      elapsedToTicks(yoMs, file.metronomeBpm, METER, DEFAULT_PPQ),
    );
  });
});
