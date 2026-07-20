import { describe, expect, it } from "vitest";
import { createProjectV5Seed } from "@stagesync/shared";
import {
  addFormaSubsection,
  applyCountdownLengthFromBoundary,
  countdownBars,
  deleteFormaSubsection,
  formaSubsectionRows,
  renameFormaClip,
  setCountdownBars,
  setFormaSubsectionStartBar,
} from "./formaInspector.js";
import { insertFormaSubsectionAt } from "./formaEdit.js";

describe("formaInspector", () => {
  const project = createProjectV5Seed(
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

  it("setCountdownBars lengthen shifts then renorms so post-CD stays at song start", () => {
    const intro = project.forma.clips.find((c) => c.kind === "section")!;
    const withChord = {
      ...project,
      akordy: {
        clips: [
          {
            id: "ch-1",
            startTicks: 0,
            lengthTicks: 960,
            symbol: "C",
          },
          {
            id: "ch-2",
            startTicks: 3840,
            lengthTicks: 960,
            symbol: "G",
          },
        ],
      },
    };
    const next = setCountdownBars(withChord, 4);
    const cd = next.forma.clips.find((c) => c.kind === "countdown")!;
    const section = next.forma.clips.find((c) => c.id === intro.id)!;
    expect(cd.lengthTicks).toBe(3840 * 4);
    expect(cd.startTicks + cd.lengthTicks).toBe(0);
    expect(section.startTicks).toBe(0);
    expect(next.akordy.clips.find((c) => c.id === "ch-1")?.startTicks).toBe(0);
    expect(next.akordy.clips.find((c) => c.id === "ch-2")?.startTicks).toBe(
      3840,
    );
    expect(next.tempoMap[0]?.startTicks).toBe(0);
  });

  it("setCountdownBars shorten pulls post-CD left after renorm", () => {
    const next = setCountdownBars(project, 1);
    const cd = next.forma.clips.find((c) => c.kind === "countdown")!;
    const intro = next.forma.clips.find((c) => c.kind === "section")!;
    expect(cd.lengthTicks).toBe(3840);
    expect(cd.startTicks).toBe(-3840);
    expect(intro.startTicks).toBe(0);
  });

  it("applyCountdownLengthFromBoundary snaps to bars", () => {
    // CD [-7680, 0); desire end ≈ +2000 → length ~9680 → 3 bars after round.
    const next = applyCountdownLengthFromBoundary(project, 2000);
    const cd = next.forma.clips.find((c) => c.kind === "countdown")!;
    expect(countdownBars(next, cd)).toBe(3);
    expect(cd.startTicks + cd.lengthTicks).toBe(0);
  });

  it("applyCountdownLengthFromBoundary shortens toward min 1 bar", () => {
    const next = applyCountdownLengthFromBoundary(project, -5000);
    const cd = next.forma.clips.find((c) => c.kind === "countdown")!;
    expect(countdownBars(next, cd)).toBe(1);
    expect(cd.startTicks).toBe(-3840);
  });

  it("setCountdownBars scrubs countdown digits without persisting new ones", () => {
    const withSpill = {
      ...project,
      tekst: {
        clips: [
          {
            id: "vl-cd-1",
            text: "1",
            startTicks: -3840,
            lengthTicks: 25920,
          },
          {
            id: "vl-line",
            text: "Hello",
            startTicks: 3840,
            lengthTicks: 3840,
          },
        ],
      },
    };
    const next = setCountdownBars(withSpill, 3);
    const digits = next.tekst.clips.filter((c) => /^vl-cd-/i.test(c.id));
    expect(digits).toHaveLength(0);
    const cd = next.forma.clips.find((c) => c.kind === "countdown")!;
    expect(countdownBars(next, cd)).toBe(3);
    expect(next.tekst.clips.find((c) => c.id === "vl-line")?.startTicks).toBe(
      3840,
    );
  });

  it("countdownBars reads bar count from clip", () => {
    const cd = project.forma.clips.find((c) => c.kind === "countdown")!;
    expect(countdownBars(project, cd)).toBe(2);
  });

  it("formaSubsectionRows empty until interior boundary exists", () => {
    const section = project.forma.clips.find((c) => c.kind === "section")!;
    expect(formaSubsectionRows(project, section)).toEqual([]);
  });

  it("addFormaSubsection inserts midpoint and returns selectIdx", () => {
    const section = project.forma.clips.find((c) => c.kind === "section")!;
    // Seed needs enough length — stretch intro if needed
    let p = project;
    const intro = p.forma.clips.find((c) => c.id === section.id)!;
    if (intro.lengthTicks < 7680 * 4) {
      p = {
        ...p,
        forma: {
          clips: p.forma.clips.map((c) =>
            c.id === section.id
              ? { ...c, lengthTicks: 7680 * 8 }
              : c,
          ),
        },
      };
    }
    const added = addFormaSubsection(p, section.id);
    expect(added).not.toBeNull();
    const rows = formaSubsectionRows(added!.project, {
      ...p.forma.clips.find((c) => c.id === section.id)!,
      subsections: added!.project.forma.clips.find((c) => c.id === section.id)!
        .subsections,
    });
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(added!.selectIdx).toBeGreaterThanOrEqual(1);
  });

  it("deleteFormaSubsection merges; clears when remaining span ≤ 4 bars", () => {
    const section = project.forma.clips.find((c) => c.kind === "section")!;
    const bar = 3840; // 4/4 @ ppq 960
    let p = {
      ...project,
      forma: {
        clips: project.forma.clips.map((c) =>
          c.id === section.id
            ? { ...c, lengthTicks: bar * 4, startTicks: 0 }
            : c,
        ),
      },
    };
    p = insertFormaSubsectionAt(p, section.id, bar * 2);
    expect(
      formaSubsectionRows(
        p,
        p.forma.clips.find((c) => c.id === section.id)!,
      ).length,
    ).toBe(2);

    const del = deleteFormaSubsection(p, section.id, 1);
    expect(del).not.toBeNull();
    const clip = del!.project.forma.clips.find((c) => c.id === section.id)!;
    expect(clip.subsections?.length ?? 0).toBe(0);
    expect(formaSubsectionRows(del!.project, clip)).toEqual([]);
  });

  it("setFormaSubsectionStartBar moves interior boundary", () => {
    const section = project.forma.clips.find((c) => c.kind === "section")!;
    let p = {
      ...project,
      forma: {
        clips: project.forma.clips.map((c) =>
          c.id === section.id
            ? { ...c, lengthTicks: 7680 * 8, startTicks: 0 }
            : c,
        ),
      },
    };
    p = insertFormaSubsectionAt(p, section.id, 7680 * 2);
    const next = setFormaSubsectionStartBar(p, section.id, 1, 5);
    const clip = next.forma.clips.find((c) => c.id === section.id)!;
    const rows = formaSubsectionRows(next, clip);
    expect(rows[1]?.startDisplayBar).toBe(5);
  });
});
