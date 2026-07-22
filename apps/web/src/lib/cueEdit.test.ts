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
    p = deleteCueClip(p, id);
    expect(p.cue.clips).toHaveLength(0);
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
});
