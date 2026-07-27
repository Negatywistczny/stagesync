import { describe, expect, it } from "vitest";
import { createProjectSeed } from "@stagesync/shared";
import {
  addAudioHardwareOutput,
  nextHardwareChannelOffset,
  nextHardwareOutputName,
  removeAudioHardwareOutput,
  updateAudioHardwareOutput,
} from "./audioHwEdit.js";

describe("audioHwEdit", () => {
  it("names and offsets HW patches past Master 0–1", () => {
    expect(nextHardwareOutputName([])).toBe("HW 1");
    expect(nextHardwareOutputName([{ name: "HW 2" }])).toBe("HW 3");
    expect(nextHardwareChannelOffset([])).toBe(2);
    expect(
      nextHardwareChannelOffset([
        {
          id: "a",
          name: "HW 1",
          channelOffset: 2,
          channelMode: "stereo",
        },
      ]),
    ).toBe(4);
  });

  it("add / update / remove and reassigns track routing", () => {
    let p = createProjectSeed("song-1", "t", "2026-07-27T00:00:00.000Z");
    p = {
      ...p,
      audioTracks: [
        {
          id: "tr1",
          name: "Audio 1",
          muted: false,
        },
      ],
    };
    const added = addAudioHardwareOutput(p, { name: "IEM" });
    p = added.project;
    expect(p.audioHardwareOutputs).toHaveLength(1);
    expect(p.audioHardwareOutputs![0]!.channelOffset).toBe(2);

    p = {
      ...p,
      audioTracks: p.audioTracks.map((t, i) =>
        i === 0
          ? {
              ...t,
              output: { kind: "hw_out" as const, hwOutputId: added.hwOutputId },
            }
          : t,
      ),
    };
    p = updateAudioHardwareOutput(p, added.hwOutputId, {
      gainDb: -3,
      muted: true,
    });
    expect(p.audioHardwareOutputs![0]!.gainDb).toBe(-3);
    expect(p.audioHardwareOutputs![0]!.muted).toBe(true);

    p = removeAudioHardwareOutput(p, added.hwOutputId);
    expect(p.audioHardwareOutputs ?? []).toHaveLength(0);
    expect(p.audioTracks[0]!.output).toBeUndefined();
  });
});
