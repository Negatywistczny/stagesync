import { describe, expect, it } from "vitest";
import { createProjectSeed } from "@stagesync/shared";
import {
  addAudioHardwareOutput,
  allocatedPhysicalChannelCount,
  canAddHardwareOutput,
  nextHardwareChannelOffset,
  nextHardwareOutputName,
  removeAudioHardwareOutput,
  setMasterOutputRouting,
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

  it("tracks physical channel budget vs maxChannelCount", () => {
    expect(allocatedPhysicalChannelCount([])).toBe(2);
    const oneStereo = [
      {
        id: "a",
        name: "HW 1",
        channelOffset: 2,
        channelMode: "stereo" as const,
      },
    ];
    expect(allocatedPhysicalChannelCount(oneStereo)).toBe(4);
    expect(canAddHardwareOutput([], 4)).toBe(true);
    expect(canAddHardwareOutput(oneStereo, 4)).toBe(false);
    expect(canAddHardwareOutput(oneStereo, 8)).toBe(true);
    expect(canAddHardwareOutput([], 2)).toBe(false);

    const p = createProjectSeed("song-1", "t", "2026-07-27T00:00:00.000Z");
    const first = addAudioHardwareOutput(p, undefined, { maxChannelCount: 4 });
    expect(() =>
      addAudioHardwareOutput(first.project, undefined, { maxChannelCount: 4 }),
    ).toThrow(/No free hardware channels/);
  });

  it("allocates HW into free slots when Master is remapped", () => {
    expect(
      nextHardwareChannelOffset([], "stereo", { channelOffset: 4 }, 8),
    ).toBe(0);
    // Master on CH 3–4 frees CH 1–2 for a stereo HW patch on a 4-ch device.
    expect(
      canAddHardwareOutput([], 4, "stereo", { channelOffset: 2 }),
    ).toBe(true);
    expect(
      nextHardwareChannelOffset([], "stereo", { channelOffset: 2 }, 4),
    ).toBe(0);
  });

  it("setMasterOutputRouting rejects overlap with HW patches", () => {
    let p = createProjectSeed("song-1", "t", "2026-07-27T00:00:00.000Z");
    p = addAudioHardwareOutput(p).project;
    expect(() => setMasterOutputRouting(p, { channelOffset: 2 })).toThrow(
      /overlap/,
    );
    p = setMasterOutputRouting(p, { channelOffset: 4 });
    expect(p.masterOutput?.channelOffset).toBe(4);
    p = setMasterOutputRouting(p, null);
    expect(p.masterOutput).toBeUndefined();
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
      channelMode: "mono",
    });
    expect(p.audioHardwareOutputs![0]!.gainDb).toBe(-3);
    expect(p.audioHardwareOutputs![0]!.muted).toBe(true);
    expect(p.audioHardwareOutputs![0]!.channelMode).toBe("mono");

    p = removeAudioHardwareOutput(p, added.hwOutputId);
    expect(p.audioHardwareOutputs ?? []).toHaveLength(0);
    expect(p.audioTracks[0]!.output).toBeUndefined();
  });
});
