import { describe, expect, it } from "vitest";
import { createProjectV5Seed } from "@stagesync/shared";
import {
  buildKaraokeLiveContext,
  formatKaraokeTransportLine,
} from "./clientKaraoke.js";

describe("clientKaraoke", () => {
  const project = createProjectV5Seed(
    "id",
    "Demo Song",
    "2026-07-20T00:00:00.000Z",
  );

  it("buildKaraokeLiveContext returns section and lyric window", () => {
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
  });

  it("exposes section bar strip with beat progress (CL-01)", () => {
    const ctx = buildKaraokeLiveContext(project, 500);
    expect(ctx?.sectionBars.length).toBe(2);
    expect(ctx?.sectionBars.some((b) => b.current)).toBe(true);
    expect(ctx?.sectionBars.find((b) => b.current)?.beatProgress).toBeGreaterThan(
      0,
    );
    expect(ctx?.currentBeat).toBeGreaterThanOrEqual(1);
  });
});
