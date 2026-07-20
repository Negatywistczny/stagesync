import { describe, expect, it } from "vitest";
import {
  createProjectV5Seed,
  DEFAULT_PPQ,
  ticksPerBar,
} from "@stagesync/shared";
import {
  buildKaraokeLiveContext,
  formatKaraokeTransportLine,
  groupKaraokeSections,
  isPlaceholderLyric,
  mergeTekstWithCountdownDigits,
  resolveFormaClipForLyric,
} from "./clientKaraoke.js";

const BAR = ticksPerBar({ numerator: 4, denominator: 4 }, DEFAULT_PPQ); // 3840
const BEAT = DEFAULT_PPQ; // 960

describe("clientKaraoke", () => {
  const project = createProjectV5Seed(
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
  });

  it("exposes section bar strip when section has no lyrics (CL-01 / v4 progress)", () => {
    const ctx = buildKaraokeLiveContext(project, 500);
    const intro = ctx?.sections.find((s) => s.name === "Intro");
    expect(intro?.useProgress).toBe(true);
    expect(intro?.bars.length).toBe(2);
    expect(intro?.bars.some((b) => b.current)).toBe(true);
    expect(intro?.bars.find((b) => b.current)?.beatProgress).toBeGreaterThan(
      0,
    );
    expect(ctx?.sectionBars.length).toBe(2);
    expect(ctx?.currentBeat).toBeGreaterThanOrEqual(1);
  });

  it("isPlaceholderLyric matches v4 bracket placeholders", () => {
    expect(isPlaceholderLyric("")).toBe(true);
    expect(isPlaceholderLyric("[Intro]")).toBe(true);
    expect(isPlaceholderLyric("Hello")).toBe(false);
  });

  it("groups lyric lines under Forma section cards", () => {
    const withLyrics = {
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
          {
            id: "tx-1",
            text: "Line in Intro",
            startTicks: 0,
            lengthTicks: 1920,
          },
          {
            id: "tx-2",
            text: "Line in Verse",
            startTicks: 7680,
            lengthTicks: 1920,
          },
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

  it("groupKaraokeSections assigns by lyric startTicks", () => {
    const clips = mergeTekstWithCountdownDigits(project, 0);
    const groups = groupKaraokeSections(project, clips, 0, null);
    expect(groups.some((g) => g.name === "Intro" && g.useProgress)).toBe(
      true,
    );
  });

  it("assigns przedtakt (last-bar onset before next Forma) to next section", () => {
    // v4 resolveVocalSectionId: Hello @ 2 beats before Verse → Verse, not CD.
    const withPickup = {
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
          {
            id: "tx-pickup",
            text: "Hello",
            // 2 beats before Verse — straddles CD→Verse boundary
            startTicks: -2 * BEAT,
            lengthTicks: 4 * BEAT,
          },
          {
            id: "tx-verse",
            text: "World",
            startTicks: 2 * BEAT,
            lengthTicks: 2 * BEAT,
          },
          {
            id: "tx-early",
            text: "Stay on CD",
            // More than one bar before Verse — not pickup
            startTicks: -2 * BAR + BEAT,
            lengthTicks: BEAT,
          },
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
    expect(cd.lines.map((l) => l.text).filter((t) => t === "Stay on CD")).toEqual(
      ["Stay on CD"],
    );

    // After CD: World active → Verse card highlighted via pickup affiliation path.
    const ctxInVerse = buildKaraokeLiveContext(withPickup, BEAT)!;
    expect(ctxInVerse.sections.find((s) => s.name === "Zwrotka")?.active).toBe(
      true,
    );
  });

  it("keeps Countdown digits on Countdown despite pickup window", () => {
    const digit = {
      id: "tx-digit",
      text: "1",
      startTicks: -2 * BEAT,
      lengthTicks: BEAT,
    };
    const host = resolveFormaClipForLyric(
      project,
      project.forma.clips.filter(
        (c) => c.kind === "section" || c.kind === "countdown",
      ),
      digit,
    );
    expect(host?.kind).toBe("countdown");
  });
});
