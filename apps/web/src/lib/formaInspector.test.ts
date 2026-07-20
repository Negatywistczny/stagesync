import { describe, expect, it } from "vitest";
import { createProjectV3Seed } from "@stagesync/shared";
import {
  countdownBars,
  renameFormaClip,
  setCountdownBars,
} from "./formaInspector.js";

describe("formaInspector", () => {
  const project = createProjectV3Seed(
    "id",
    "Demo",
    "2026-07-20T00:00:00.000Z",
  );

  it("renameFormaClip updates section name in draft shape", () => {
    const section = project.forma.clips.find((c) => c.kind === "section")!;
    const next = renameFormaClip(project, section.id, "Verse");
    const updated = next.forma.clips.find((c) => c.id === section.id);
    expect(updated?.name).toBe("Verse");
  });

  it("setCountdownBars keeps end at content floor (tick 0)", () => {
    const cd = project.forma.clips.find((c) => c.kind === "countdown")!;
    const next = setCountdownBars(project, 3);
    const updated = next.forma.clips.find((c) => c.id === cd.id)!;
    expect(updated.lengthTicks).toBe(7680 * 1.5); // 3 bars @ 4/4
    expect(updated.startTicks).toBe(-updated.lengthTicks);
    expect(updated.startTicks + updated.lengthTicks).toBe(0);
  });

  it("countdownBars reads bar count from clip", () => {
    const cd = project.forma.clips.find((c) => c.kind === "countdown")!;
    expect(countdownBars(project, cd)).toBe(2);
  });
});
