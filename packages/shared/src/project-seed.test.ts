import { describe, expect, it } from "vitest";
import { createProjectV2Seed, upgradeProjectV1ToV2 } from "./project-seed.js";

describe("createProjectV2Seed", () => {
  it("seeds Countdown at -7680 (2 bars @ PPQ 960)", () => {
    const p = createProjectV2Seed(
      "id-1",
      "Demo",
      "2026-07-20T00:00:00.000Z",
    );
    const cd = p.forma.clips.find((c) => c.kind === "countdown");
    expect(cd?.startTicks).toBe(-7680);
    expect(cd?.lengthTicks).toBe(7680);
    expect(p.forma.clips.find((c) => c.startTicks === 0)?.name).toBe("Intro");
  });
});

describe("upgradeProjectV1ToV2", () => {
  it("preserves id and name from v1", () => {
    const v2 = upgradeProjectV1ToV2({
      id: "abc",
      name: "Old",
      updatedAt: "2026-07-19T12:00:00.000Z",
    });
    expect(v2.id).toBe("abc");
    expect(v2.name).toBe("Old");
    expect(v2.formatVersion).toBe(2);
    expect(v2.forma.clips.length).toBeGreaterThan(0);
  });
});
