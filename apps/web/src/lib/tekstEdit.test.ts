import { describe, expect, it } from "vitest";
import {
  createProjectV6Seed,
  withWholeLineTekstBlocks,
  type TekstClip,
} from "@stagesync/shared";
import {
  deleteTekstClip,
  pencilTekstClick,
  resolveTekstClipAt,
  setTekstClipStart,
  setTekstClipText,
} from "./tekstEdit.js";

describe("tekstEdit", () => {
  it("pencilTekstClick inserts 1 bar clip with whole-line block", () => {
    const p = createProjectV6Seed("p", "S", "2026-07-20T12:00:00.000Z");
    const next = pencilTekstClick(p, 0, "Hello");
    expect(next.tekst.clips).toHaveLength(1);
    const clip = next.tekst.clips[0]!;
    expect(clip.text).toBe("Hello");
    expect(clip.lengthTicks).toBe(3840);
    expect(clip.blocks).toHaveLength(1);
    expect(clip.blocks[0]).toMatchObject({
      startTicks: clip.startTicks,
      lengthTicks: clip.lengthTicks,
      text: "Hello",
    });
  });

  it("setTekstClipText syncs sole block; multi-block keeps block timing", () => {
    let p = createProjectV6Seed("p", "S", "2026-07-20T12:00:00.000Z");
    p = pencilTekstClick(p, 0, "A");
    const id = p.tekst.clips[0]!.id;
    p = setTekstClipText(p, id, "B");
    expect(resolveTekstClipAt(p, 100)?.text).toBe("B");
    expect(p.tekst.clips[0]!.blocks[0]!.text).toBe("B");

    const multi: TekstClip = {
      id: "multi",
      startTicks: 0,
      lengthTicks: 3840,
      text: "line",
      blocks: [
        { id: "b0", startTicks: 0, lengthTicks: 1920, text: "hel" },
        { id: "b1", startTicks: 1920, lengthTicks: 1920, text: "lo" },
      ],
    };
    p = { ...p, tekst: { clips: [multi] } };
    p = setTekstClipText(p, "multi", "edited line");
    expect(p.tekst.clips[0]!.text).toBe("edited line");
    expect(p.tekst.clips[0]!.blocks).toEqual(multi.blocks);

    p = deleteTekstClip(p, "multi");
    expect(p.tekst.clips).toHaveLength(0);
  });

  it("setTekstClipStart applies Δstart to all blocks", () => {
    const clip: TekstClip = {
      id: "multi",
      startTicks: 0,
      lengthTicks: 3840,
      text: "line",
      blocks: [
        { id: "b0", startTicks: 0, lengthTicks: 1920, text: "hel" },
        { id: "b1", startTicks: 1920, lengthTicks: 1920, text: "lo" },
      ],
    };
    let p = createProjectV6Seed("p", "S", "2026-07-20T12:00:00.000Z");
    p = { ...p, tekst: { clips: [clip] } };
    p = setTekstClipStart(p, "multi", 960);
    expect(p.tekst.clips[0]!.startTicks).toBe(960);
    expect(p.tekst.clips[0]!.blocks.map((b) => b.startTicks)).toEqual([
      960, 2880,
    ]);
  });

  it("overwrite creates -r remnant with remapped blocks", () => {
    let p = createProjectV6Seed("p", "S", "2026-07-20T12:00:00.000Z");
    p = {
      ...p,
      tekst: {
        clips: [
          withWholeLineTekstBlocks({
            id: "tekst-main",
            text: "KeepMe",
            startTicks: 0,
            lengthTicks: 15360,
          }),
        ],
      },
    };
    p = pencilTekstClick(p, 3840, "New");
    const remnant = p.tekst.clips.find((c) => c.id.endsWith("-r"));
    expect(remnant).toBeTruthy();
    expect(remnant!.text).toBe("KeepMe");
    expect(remnant!.blocks).toHaveLength(1);
    expect(remnant!.blocks[0]!.startTicks).toBe(remnant!.startTicks);
    expect(remnant!.blocks[0]!.lengthTicks).toBe(remnant!.lengthTicks);
  });
});
