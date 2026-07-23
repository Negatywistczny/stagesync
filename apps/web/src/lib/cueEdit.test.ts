import { describe, expect, it } from "vitest";
import { createProjectV5Seed } from "@stagesync/shared";
import {
  deleteCueClip,
  pencilCueClick,
  setCueClipLabel,
  setCueClipPriority,
  setCueClipRoles,
} from "./cueEdit.js";

describe("cueEdit", () => {
  it("pencil inserts cue + label/delete", () => {
    let p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    p = pencilCueClick(p, 0, "Lights");
    expect(p.cue.clips).toHaveLength(1);
    expect(p.cue.clips[0]?.label).toBe("Lights");
    const id = p.cue.clips[0]!.id;
    p = setCueClipLabel(p, id, "Fog");
    expect(p.cue.clips[0]?.label).toBe("Fog");
    p = setCueClipLabel(p, id, "   ");
    expect(p.cue.clips[0]?.label).toBe("Cue");
    p = deleteCueClip(p, id);
    expect(p.cue.clips).toHaveLength(0);
    expect(deleteCueClip(p, "missing")).toBe(p);
  });

  it("sets roles and alert priority", () => {
    let p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    p = pencilCueClick(p, 0, "Go");
    const id = p.cue.clips[0]!.id;
    p = setCueClipRoles(p, id, ["karaoke", "grid"]);
    expect(p.cue.clips[0]?.roles).toEqual(["karaoke", "grid"]);
    p = setCueClipPriority(p, id, "alert");
    expect(p.cue.clips[0]?.priority).toBe("alert");
    p = setCueClipRoles(p, id, []);
    expect(p.cue.clips[0]?.roles).toBeUndefined();
    p = setCueClipPriority(p, id, "normal");
    expect(p.cue.clips[0]?.priority).toBeUndefined();
  });

  it("overwrite creates -r remnant resolved via parent id", () => {
    let p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    p = {
      ...p,
      cue: {
        clips: [
          {
            id: "cue-main",
            startTicks: 0,
            lengthTicks: 15360,
            label: "Main",
            roles: ["drums"],
            priority: "alert",
          },
        ],
      },
    };
    p = pencilCueClick(p, 3840, "Mid");
    const remnant = p.cue.clips.find((c) => c.id.endsWith("-r"));
    expect(remnant).toBeTruthy();
    expect(remnant!.label).toBe("Main");
    expect(remnant!.roles).toEqual(["drums"]);
    expect(remnant!.priority).toBe("alert");
  });

  it("defaults label when remnant id has no resolvable parent", () => {
    let p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    p = {
      ...p,
      cue: {
        clips: [
          // Occupying -r first so allocateUniqueClipId mints cue-main-r-2
          {
            id: "cue-main-r",
            startTicks: 20000,
            lengthTicks: 3840,
            label: "OccupyingR",
          },
          { id: "cue-main", startTicks: 0, lengthTicks: 15360, label: "Main" },
        ],
      },
    };
    p = pencilCueClick(p, 3840, "Mid");
    const weird = p.cue.clips.find((c) => /cue-main-r-/.test(c.id));
    expect(weird).toBeTruthy();
    expect(weird!.label).toBe("Cue");
  });

  it("pencil with blank label defaults to Cue", () => {
    let p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    p = pencilCueClick(p, 0, "   ");
    expect(p.cue.clips[0]!.label).toBe("Cue");
  });
});
