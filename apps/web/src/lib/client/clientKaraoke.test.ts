import { describe, expect, it } from "vitest";
import {
  createProjectV6Seed,
  DEFAULT_PPQ,
  ticksPerBar,
  withWholeLineTekstBlocks,
  type Project,
  type TekstClip,
} from "@stagesync/shared";
import {
  buildKaraokeLiveContext,
  collectTekstBlockRoles,
  filterTekstBlocksByRole,
  formatKaraokeTransportLine,
  groupKaraokeSections,
  isPlaceholderLyric,
  mapKaraokeBlocks,
  mergeTekstWithCountdownDigits,
  resolveActiveBlockId,
  resolveFormaClipForLyric,
  resolveFormaClipForLyricStart,
} from "./clientKaraoke.js";

const BAR = ticksPerBar({ numerator: 4, denominator: 4 }, DEFAULT_PPQ); // 3840
const BEAT = DEFAULT_PPQ; // 960

function lineClip(
  partial: Omit<TekstClip, "blocks"> & { blocks?: TekstClip["blocks"] },
): TekstClip {
  if (partial.blocks != null && partial.blocks.length > 0) {
    return partial as TekstClip;
  }
  return withWholeLineTekstBlocks(partial);
}

describe("clientKaraoke", () => {
  const project = createProjectV6Seed(
    "id",
    "Demo Song",
    "2026-07-20T00:00:00.000Z",
  );

  it("buildKaraokeLiveContext returns section and lyric lines", () => {
    const ctx = buildKaraokeLiveContext(project, 0);
    expect(ctx).not.toBeNull();
    expect(ctx?.songTitle).toBe("Demo Song");
    expect(ctx?.sectionName).toBe("Intro");
    expect(ctx?.bbtLabel).toBe("1.1");
    expect(ctx?.hasLyricLines).toBe(false);
    expect(ctx?.lines).toEqual([]);
    expect(ctx?.activeBlockId).toBeNull();
    expect(ctx?.availableRoles).toEqual([]);
  });

  it("formatKaraokeTransportLine includes section and tempo", () => {
    const ctx = buildKaraokeLiveContext(project, 0)!;
    const line = formatKaraokeTransportLine(ctx, {
      numerator: 4,
      denominator: 4,
    });
    expect(line).toContain("Intro");
    expect(line).toContain("1.1");
    expect(line).toContain("BPM");
  });

  it("formatKaraokeTransportLine falls back to meter when label empty", () => {
    const ctx = {
      ...buildKaraokeLiveContext(project, 0)!,
      meterLabel: "",
    };
    const line = formatKaraokeTransportLine(ctx, {
      numerator: 3,
      denominator: 8,
    });
    expect(line).toContain("3/8");
  });

  it("buildKaraokeLiveContext returns null without project", () => {
    expect(buildKaraokeLiveContext(null, 0)).toBeNull();
  });

  it("merges synthetic CD digits into karaoke during Countdown", () => {
    const ctx = buildKaraokeLiveContext(project, -5000);
    expect(ctx?.hasLyricLines).toBe(true);
    expect(ctx?.lyricLine).toBe("2");
    expect(ctx?.lines.some((l) => l.text === "2" && l.active)).toBe(true);
    const cd = ctx?.sections.find((s) => s.kind === "countdown");
    expect(cd?.useProgress).toBe(false);
    expect(cd?.lines.some((l) => l.text === "2")).toBe(true);
    // Migrated 1:1 digit → one whole-line block active with the line.
    const digit = ctx?.lines.find((l) => l.text === "2");
    expect(digit?.blocks).toHaveLength(1);
    expect(digit?.blocks?.[0]?.active).toBe(true);
    expect(ctx?.activeBlockId).toBe(digit?.blocks?.[0]?.id);
  });

  it("exposes section bar strip when section has no lyrics (CL-01 / v4 progress)", () => {
    const ctx = buildKaraokeLiveContext(project, 500);
    const intro = ctx?.sections.find((s) => s.name === "Intro");
    expect(intro?.useProgress).toBe(true);
    expect(intro?.bars.length).toBe(2);
    expect(intro?.bars.some((b) => b.current)).toBe(true);
    expect(intro?.bars.find((b) => b.current)?.beatProgress).toBeGreaterThan(0);
    expect(ctx?.sectionBars.length).toBe(2);
    expect(ctx?.currentBeat).toBeGreaterThanOrEqual(1);
  });

  it("isPlaceholderLyric matches v4 bracket placeholders", () => {
    expect(isPlaceholderLyric("")).toBe(true);
    expect(isPlaceholderLyric("   ")).toBe(true);
    expect(isPlaceholderLyric("[Intro]")).toBe(true);
    expect(isPlaceholderLyric("Hello")).toBe(false);
    expect(isPlaceholderLyric("[Intro] more")).toBe(false);
    expect(isPlaceholderLyric("[unclosed")).toBe(false);
  });

  it("groups lyric lines under Forma section cards", () => {
    const withLyrics: Project = {
      ...project,
      forma: {
        clips: [
          ...project.forma.clips,
          {
            id: "forma-verse",
            name: "Zwrotka",
            kind: "section" as const,
            startTicks: 7680,
            lengthTicks: 7680,
          },
        ],
      },
      tekst: {
        clips: [
          lineClip({
            id: "tx-1",
            text: "Line in Intro",
            startTicks: 0,
            lengthTicks: 1920,
          }),
          lineClip({
            id: "tx-2",
            text: "Line in Verse",
            startTicks: 7680,
            lengthTicks: 1920,
          }),
        ],
      },
    };

    const ctx = buildKaraokeLiveContext(withLyrics, 100);
    expect(ctx?.sections.map((s) => s.name)).toEqual([
      "Countdown",
      "Intro",
      "Zwrotka",
    ]);

    const intro = ctx!.sections.find((s) => s.name === "Intro")!;
    const verse = ctx!.sections.find((s) => s.name === "Zwrotka")!;
    expect(intro.useProgress).toBe(false);
    expect(intro.lines.map((l) => l.text)).toEqual(["Line in Intro"]);
    expect(intro.active).toBe(true);
    expect(intro.lines[0]?.active).toBe(true);
    expect(verse.useProgress).toBe(false);
    expect(verse.lines.map((l) => l.text)).toEqual(["Line in Verse"]);
    expect(verse.active).toBe(false);
    // Lyric sections: no top-level progress strip
    expect(ctx?.sectionBars).toEqual([]);
  });

  it("does not highlight lyric lines during rests between clips (v4 findActiveLine)", () => {
    const withGap: Project = {
      ...project,
      tekst: {
        clips: [
          lineClip({
            id: "tx-a",
            text: "A",
            startTicks: 0,
            lengthTicks: 2 * BEAT,
          }),
          lineClip({
            id: "tx-b",
            text: "B",
            startTicks: 4 * BEAT,
            lengthTicks: 2 * BEAT,
          }),
        ],
      },
    };

    const inA = buildKaraokeLiveContext(withGap, BEAT)!;
    expect(inA.lines.find((l) => l.active)?.text).toBe("A");

    const inRest = buildKaraokeLiveContext(withGap, 3 * BEAT)!;
    expect(inRest.lines.every((l) => !l.active)).toBe(true);
    expect(inRest.lyricLine).toBeNull();
    expect(inRest.activeBlockId).toBeNull();

    const inB = buildKaraokeLiveContext(withGap, 5 * BEAT)!;
    expect(inB.lines.find((l) => l.active)?.text).toBe("B");
  });

  it("groupKaraokeSections assigns by lyric startTicks", () => {
    const clips = mergeTekstWithCountdownDigits(project, 0);
    const groups = groupKaraokeSections(project, clips, 0, null);
    expect(groups.some((g) => g.name === "Intro" && g.useProgress)).toBe(true);
  });

  it("assigns przedtakt (last-bar onset before next Forma) to next section", () => {
    // v4 resolveVocalSectionId: Hello @ 2 beats before Verse → Verse, not CD.
    const withPickup: Project = {
      ...project,
      forma: {
        clips: [
          {
            id: "forma-cd",
            name: "Countdown",
            kind: "countdown" as const,
            startTicks: -2 * BAR,
            lengthTicks: 2 * BAR,
          },
          {
            id: "forma-verse",
            name: "Zwrotka",
            kind: "section" as const,
            startTicks: 0,
            lengthTicks: 2 * BAR,
          },
          {
            id: "forma-chorus",
            name: "Refren",
            kind: "section" as const,
            startTicks: 2 * BAR,
            lengthTicks: 2 * BAR,
          },
        ],
      },
      tekst: {
        clips: [
          lineClip({
            id: "tx-pickup",
            text: "Hello",
            // 2 beats before Verse — straddles CD→Verse boundary
            startTicks: -2 * BEAT,
            lengthTicks: 4 * BEAT,
          }),
          lineClip({
            id: "tx-verse",
            text: "World",
            startTicks: 2 * BEAT,
            lengthTicks: 2 * BEAT,
          }),
          lineClip({
            id: "tx-early",
            text: "Stay on CD",
            // More than one bar before Verse — not pickup
            startTicks: -2 * BAR + BEAT,
            lengthTicks: BEAT,
          }),
        ],
      },
    };

    const forma = withPickup.forma.clips;
    expect(
      resolveFormaClipForLyric(withPickup, forma, withPickup.tekst.clips[0]!)
        ?.name,
    ).toBe("Zwrotka");
    expect(
      resolveFormaClipForLyric(withPickup, forma, withPickup.tekst.clips[1]!)
        ?.name,
    ).toBe("Zwrotka");
    expect(
      resolveFormaClipForLyric(withPickup, forma, withPickup.tekst.clips[2]!)
        ?.name,
    ).toBe("Countdown");

    const ctx = buildKaraokeLiveContext(withPickup, -BEAT);
    const verse = ctx!.sections.find((s) => s.name === "Zwrotka")!;
    const cd = ctx!.sections.find((s) => s.kind === "countdown")!;
    expect(verse.lines.map((l) => l.text)).toEqual(["Hello", "World"]);
    expect(
      cd.lines.map((l) => l.text).filter((t) => t === "Stay on CD"),
    ).toEqual(["Stay on CD"]);

    // After CD: World active → Verse card highlighted via pickup affiliation path.
    const ctxInVerse = buildKaraokeLiveContext(withPickup, BEAT)!;
    expect(ctxInVerse.sections.find((s) => s.name === "Zwrotka")?.active).toBe(
      true,
    );
  });

  it("keeps Countdown digits on Countdown despite pickup window", () => {
    const digit = lineClip({
      id: "tx-digit",
      text: "1",
      startTicks: -2 * BEAT,
      lengthTicks: BEAT,
    });
    const host = resolveFormaClipForLyric(
      project,
      project.forma.clips.filter(
        (c) => c.kind === "section" || c.kind === "countdown",
      ),
      digit,
    );
    expect(host?.kind).toBe("countdown");
  });

  it("resolveFormaClipForLyricStart keeps lyric past last section end on last clip", () => {
    const forma = [
      {
        id: "only",
        name: "Only",
        kind: "section" as const,
        startTicks: 0,
        lengthTicks: BAR,
      },
    ];
    expect(resolveFormaClipForLyricStart(forma, BAR + 100)?.id).toBe("only");
    expect(resolveFormaClipForLyricStart([], 0)).toBeNull();
  });

  it("groups orphan lyrics outside any Forma span", () => {
    const orphanProj: Project = {
      ...project,
      forma: { clips: [] },
      tekst: {
        clips: [
          lineClip({
            id: "orphan-1",
            text: "Lost",
            startTicks: 0,
            lengthTicks: BEAT,
          }),
        ],
      },
    };
    const groups = groupKaraokeSections(
      orphanProj,
      orphanProj.tekst.clips,
      0,
      "orphan-1",
    );
    expect(groups.some((g) => g.id === "__orphan__")).toBe(true);
    expect(groups.find((g) => g.id === "__orphan__")?.lines[0]?.text).toBe(
      "Lost",
    );
  });

  it("activeGroup is null when playhead is past all Forma clips", () => {
    const p: Project = {
      ...project,
      tekst: { clips: [] },
    };
    const ctx = buildKaraokeLiveContext(p, 500_000);
    expect(ctx).not.toBeNull();
    expect(ctx!.sectionBars).toEqual([]);
    expect(ctx!.sectionName).toBe("—");
  });

  describe("block highlight (half-open)", () => {
    const multiBlock = lineClip({
      id: "tx-multi",
      text: "Hello world",
      startTicks: 0,
      lengthTicks: 4 * BEAT,
      blocks: [
        {
          id: "b-hello",
          text: "Hello ",
          startTicks: 0,
          lengthTicks: BEAT,
        },
        {
          id: "b-world",
          text: "world",
          startTicks: 2 * BEAT,
          lengthTicks: BEAT,
        },
      ],
    });

    const withMulti: Project = {
      ...project,
      tekst: { clips: [multiBlock] },
    };

    it("resolveActiveBlockId holds until next syllable (fills gaps)", () => {
      expect(resolveActiveBlockId(multiBlock.blocks, 0, 4 * BEAT)).toBe(
        "b-hello",
      );
      expect(resolveActiveBlockId(multiBlock.blocks, BEAT - 1, 4 * BEAT)).toBe(
        "b-hello",
      );
      // Former gap: still hello until world starts
      expect(resolveActiveBlockId(multiBlock.blocks, BEAT, 4 * BEAT)).toBe(
        "b-hello",
      );
      expect(
        resolveActiveBlockId(multiBlock.blocks, 2 * BEAT - 1, 4 * BEAT),
      ).toBe("b-hello");
      expect(resolveActiveBlockId(multiBlock.blocks, 2 * BEAT, 4 * BEAT)).toBe(
        "b-world",
      );
      expect(resolveActiveBlockId(multiBlock.blocks, 3 * BEAT, 4 * BEAT)).toBe(
        "b-world",
      );
      expect(resolveActiveBlockId(undefined, 0)).toBeNull();
    });

    it("highlights active block through gaps until next onset", () => {
      const onHello = buildKaraokeLiveContext(withMulti, BEAT / 2)!;
      expect(onHello.lines[0]?.active).toBe(true);
      expect(onHello.activeBlockId).toBe("b-hello");
      expect(
        onHello.lines[0]?.blocks?.map((b) => [b.id, b.active, b.past]),
      ).toEqual([
        ["b-hello", true, false],
        ["b-world", false, false],
      ]);

      const inGap = buildKaraokeLiveContext(withMulti, BEAT + 10)!;
      expect(inGap.lines[0]?.active).toBe(true);
      expect(inGap.activeBlockId).toBe("b-hello");
      expect(
        inGap.lines[0]?.blocks?.find((b) => b.id === "b-hello")?.active,
      ).toBe(true);
      expect(
        inGap.lines[0]?.blocks?.find((b) => b.id === "b-hello")?.past,
      ).toBe(false);

      const onWorld = buildKaraokeLiveContext(withMulti, 2 * BEAT + 10)!;
      expect(onWorld.activeBlockId).toBe("b-world");
      expect(
        onWorld.lines[0]?.blocks?.find((b) => b.id === "b-world")?.active,
      ).toBe(true);
      expect(
        onWorld.lines[0]?.blocks?.find((b) => b.id === "b-hello")?.past,
      ).toBe(true);
    });

    it("1-tick syllables stay yellow until the next block", () => {
      const flashy: Project = {
        ...project,
        tekst: {
          clips: [
            {
              id: "tx-flash",
              text: "A B C",
              startTicks: 0,
              lengthTicks: 3 * BEAT,
              blocks: [
                { id: "a", text: "A ", startTicks: 0, lengthTicks: 1 },
                { id: "b", text: "B ", startTicks: BEAT, lengthTicks: 1 },
                { id: "c", text: "C", startTicks: 2 * BEAT, lengthTicks: 1 },
              ],
            },
          ],
        },
      };
      const midA = buildKaraokeLiveContext(flashy, BEAT / 2)!;
      expect(midA.activeBlockId).toBe("a");
      expect(midA.lines[0]?.blocks?.find((b) => b.id === "a")?.active).toBe(
        true,
      );
      const midB = buildKaraokeLiveContext(flashy, BEAT + 10)!;
      expect(midB.activeBlockId).toBe("b");
    });

    it("single whole-line block mirrors line active window (migrate 1:1)", () => {
      const one: Project = {
        ...project,
        tekst: {
          clips: [
            lineClip({
              id: "tx-one",
              text: "Whole",
              startTicks: 0,
              lengthTicks: 2 * BEAT,
            }),
          ],
        },
      };
      const ctx = buildKaraokeLiveContext(one, BEAT)!;
      expect(ctx.lines[0]?.blocks).toHaveLength(1);
      expect(ctx.lines[0]?.active).toBe(true);
      expect(ctx.lines[0]?.blocks?.[0]?.active).toBe(true);
      expect(ctx.lines[0]?.blocks?.[0]?.text).toBe("Whole");
      expect(ctx.activeBlockId).toBe(ctx.lines[0]?.blocks?.[0]?.id);

      const past = buildKaraokeLiveContext(one, 2 * BEAT)!;
      expect(past.lines[0]?.active).toBe(false);
      expect(past.lines[0]?.blocks?.[0]?.active).toBe(false);
      expect(past.lines[0]?.blocks?.[0]?.past).toBe(true);
      expect(past.activeBlockId).toBeNull();
    });

    it("mapKaraokeBlocks returns undefined without blocks", () => {
      expect(
        mapKaraokeBlocks(
          {
            startTicks: 0,
            lengthTicks: 3840,
            text: "",
            blocks: undefined as unknown as TekstClip["blocks"],
          },
          0,
          true,
        ),
      ).toBeUndefined();
      expect(
        mapKaraokeBlocks(
          { startTicks: 0, lengthTicks: 3840, text: "", blocks: [] },
          0,
          true,
        ),
      ).toBeUndefined();
    });

    it("mapKaraokeBlocks restores word spaces from line text when blocks are trimmed", () => {
      const tokens = mapKaraokeBlocks(
        {
          startTicks: 0,
          lengthTicks: 3840,
          text: "I hear the drums",
          blocks: [
            { id: "b1", text: "I", startTicks: 0, lengthTicks: BEAT },
            { id: "b2", text: "hear", startTicks: BEAT, lengthTicks: BEAT },
            { id: "b3", text: "the", startTicks: 2 * BEAT, lengthTicks: BEAT },
            {
              id: "b4",
              text: "drums",
              startTicks: 3 * BEAT,
              lengthTicks: BEAT,
            },
          ],
        },
        0,
        true,
      );
      expect(tokens?.map((b) => b.text)).toEqual([
        "I ",
        "hear ",
        "the ",
        "drums",
      ]);
      expect(tokens?.map((b) => b.text).join("")).toBe("I hear the drums");
    });
  });

  describe("role filter", () => {
    const dualRole = lineClip({
      id: "tx-roles",
      text: "You me",
      startTicks: 0,
      lengthTicks: 4 * BEAT,
      blocks: [
        {
          id: "b-v1",
          text: "You ",
          startTicks: 0,
          lengthTicks: 2 * BEAT,
          role: "vocal_1",
        },
        {
          id: "b-v2",
          text: "me",
          startTicks: 2 * BEAT,
          lengthTicks: 2 * BEAT,
          role: "vocal_2",
        },
      ],
    });

    const withRoles: Project = {
      ...project,
      tekst: { clips: [dualRole] },
    };

    it("collectTekstBlockRoles lists distinct roles", () => {
      expect(collectTekstBlockRoles([dualRole])).toEqual([
        "vocal_1",
        "vocal_2",
      ]);
    });

    it("filterTekstBlocksByRole keeps untagged and all", () => {
      const mixed = [
        ...dualRole.blocks,
        {
          id: "b-all",
          text: "!",
          startTicks: 0,
          lengthTicks: BEAT,
          role: "all" as const,
        },
        {
          id: "b-free",
          text: "?",
          startTicks: 0,
          lengthTicks: BEAT,
        },
      ];
      expect(
        filterTekstBlocksByRole(mixed, "vocal_1").map((b) => b.id),
      ).toEqual(["b-v1", "b-all", "b-free"]);
    });

    it("buildKaraokeLiveContext filters blocks when ≥2 roles", () => {
      const all = buildKaraokeLiveContext(withRoles, BEAT)!;
      expect(all.availableRoles).toEqual(["vocal_1", "vocal_2"]);
      expect(all.lines[0]?.blocks).toHaveLength(2);

      const onlyV1 = buildKaraokeLiveContext(withRoles, BEAT, {
        roleFilter: "vocal_1",
      })!;
      expect(onlyV1.lines[0]?.blocks?.map((b) => b.id)).toEqual(["b-v1"]);
      expect(onlyV1.activeBlockId).toBe("b-v1");

      const onlyV2 = buildKaraokeLiveContext(withRoles, 3 * BEAT, {
        roleFilter: "vocal_2",
      })!;
      expect(onlyV2.lines[0]?.blocks?.map((b) => b.id)).toEqual(["b-v2"]);
      expect(onlyV2.activeBlockId).toBe("b-v2");
    });

    it("ignores roleFilter when fewer than 2 roles present", () => {
      const single: Project = {
        ...project,
        tekst: {
          clips: [
            lineClip({
              id: "tx-one-role",
              text: "Solo",
              startTicks: 0,
              lengthTicks: BEAT,
              blocks: [
                {
                  id: "b-solo",
                  text: "Solo",
                  startTicks: 0,
                  lengthTicks: BEAT,
                  role: "vocal_1",
                },
              ],
            }),
          ],
        },
      };
      const ctx = buildKaraokeLiveContext(single, 0, {
        roleFilter: "vocal_2",
      })!;
      expect(ctx.availableRoles).toEqual(["vocal_1"]);
      expect(ctx.lines[0]?.blocks).toHaveLength(1);
      expect(ctx.lines[0]?.blocks?.[0]?.id).toBe("b-solo");
    });
  });
});
