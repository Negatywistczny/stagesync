import { describe, expect, it } from "vitest";
import { createProjectV3Seed } from "@stagesync/shared";
import {
  buildKaraokeLiveContext,
  formatKaraokeTransportLine,
} from "./clientKaraoke.js";

describe("clientKaraoke", () => {
  const project = createProjectV3Seed(
    "id",
    "Demo Song",
    "2026-07-20T00:00:00.000Z",
  );

  it("buildKaraokeLiveContext returns section and BBT from project", () => {
    const ctx = buildKaraokeLiveContext(project, 0);
    expect(ctx).not.toBeNull();
    expect(ctx?.songTitle).toBe("Demo Song");
    expect(ctx?.sectionName).toBe("Intro");
    expect(ctx?.bbtLabel).toBe("1.1");
    expect(ctx?.hasLyricLines).toBe(false);
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
});
