import { describe, expect, it } from "vitest";
import {
  AudioBusSchema,
  AudioHardwareOutputSchema,
  ChannelModeSchema,
  MixerOutputDestSchema,
  MASTER_OUTPUT,
  MAX_AUDIO_BUSSES,
  busGraphHasCycle,
  channelModeFromChannelCount,
  hwOutputUiAllowed,
  isHwOutRepatchBlockedWhilePlaying,
  isTrackRoutedToBus,
  listMasterStereoPairOptions,
  masterOutputOverlapsHwPatches,
  nextBusName,
  resolveBusOutputDest,
  resolveChannelMode,
  resolveMasterOutputRouting,
  resolveTrackOutputDest,
  wouldCreateBusCycle,
} from "./mixer-routing.js";
import { AudioTrackSchema, ProjectSchema } from "./schema.js";
import { createProjectSeed } from "./project-seed.js";

describe("mixer routing", () => {
  it("resolves omit / master / valid bus / stale busId / hw", () => {
    const ids = ["bus-a", "bus-b"];
    expect(resolveTrackOutputDest(undefined, ids)).toEqual(MASTER_OUTPUT);
    expect(resolveTrackOutputDest({ kind: "master" }, ids)).toEqual(
      MASTER_OUTPUT,
    );
    expect(
      resolveTrackOutputDest({ kind: "bus", busId: "bus-a" }, ids),
    ).toEqual({ kind: "bus", busId: "bus-a" });
    expect(
      resolveTrackOutputDest({ kind: "bus", busId: "gone" }, ids),
    ).toEqual(MASTER_OUTPUT);
    expect(
      resolveTrackOutputDest({ kind: "bus", busId: "bus-a" }, new Set(ids)),
    ).toEqual({ kind: "bus", busId: "bus-a" });
    expect(resolveTrackOutputDest(null, ids)).toEqual(MASTER_OUTPUT);
    expect(
      resolveTrackOutputDest(
        { kind: "hw_out", hwOutputId: "hw1" },
        ids,
        ["hw1"],
      ),
    ).toEqual({ kind: "hw_out", hwOutputId: "hw1" });
    expect(
      resolveTrackOutputDest({ kind: "hw_out", hwOutputId: "hw1" }, ids),
    ).toEqual(MASTER_OUTPUT);

    expect(resolveBusOutputDest(undefined)).toEqual({ kind: "master" });
    expect(
      resolveBusOutputDest(
        { kind: "bus", busId: "bus-b" },
        { fromBusId: "bus-a", busIds: ids },
      ),
    ).toEqual({ kind: "bus", busId: "bus-b" });
    expect(
      resolveBusOutputDest(
        { kind: "bus", busId: "bus-a" },
        { fromBusId: "bus-a", busIds: ids },
      ),
    ).toEqual({ kind: "master" });
  });

  it("detects bus→bus cycles and allows DAG", () => {
    expect(
      busGraphHasCycle([
        { id: "a", output: { kind: "bus", busId: "b" } },
        { id: "b", output: { kind: "bus", busId: "a" } },
      ]),
    ).toBe(true);
    expect(
      busGraphHasCycle([
        { id: "a", output: { kind: "bus", busId: "b" } },
        { id: "b", output: { kind: "master" } },
      ]),
    ).toBe(false);
    expect(
      wouldCreateBusCycle(
        [
          { id: "a", output: { kind: "master" } },
          { id: "b", output: { kind: "bus", busId: "a" } },
        ],
        "a",
        { kind: "bus", busId: "b" },
      ),
    ).toBe(true);
    expect(
      resolveBusOutputDest(
        { kind: "bus", busId: "b" },
        {
          fromBusId: "a",
          busIds: ["a", "b"],
          busses: [
            { id: "a", output: { kind: "master" } },
            { id: "b", output: { kind: "bus", busId: "a" } },
          ],
        },
      ),
    ).toEqual({ kind: "master" });
  });

  it("hwOutputUiAllowed requires ≥4 channels", () => {
    expect(hwOutputUiAllowed(2)).toBe(false);
    expect(hwOutputUiAllowed(3)).toBe(false);
    expect(hwOutputUiAllowed(4)).toBe(true);
    expect(hwOutputUiAllowed(8)).toBe(true);
  });

  it("resolveMasterOutputRouting defaults to CH 1–2 stereo", () => {
    expect(resolveMasterOutputRouting(undefined)).toEqual({
      channelOffset: 0,
      channelMode: "stereo",
    });
    expect(resolveMasterOutputRouting({ channelOffset: 4 })).toEqual({
      channelOffset: 4,
      channelMode: "stereo",
    });
    expect(resolveMasterOutputRouting({ channelOffset: 3 })).toEqual({
      channelOffset: 2,
      channelMode: "stereo",
    });
  });

  it("listMasterStereoPairOptions marks HW collisions", () => {
    const opts = listMasterStereoPairOptions(8, [
      {
        id: "h1",
        name: "HW 1",
        channelOffset: 2,
        channelMode: "stereo",
      },
    ]);
    expect(opts.map((o) => o.channelOffset)).toEqual([0, 2, 4, 6]);
    expect(opts.find((o) => o.channelOffset === 2)?.blocked).toBe(true);
    expect(opts.find((o) => o.channelOffset === 0)?.blocked).toBe(false);
  });

  it("masterOutputOverlapsHwPatches", () => {
    expect(
      masterOutputOverlapsHwPatches({ channelOffset: 2 }, [
        {
          id: "h1",
          name: "HW",
          channelOffset: 2,
          channelMode: "stereo",
        },
      ]),
    ).toBe(true);
    expect(
      masterOutputOverlapsHwPatches(undefined, [
        {
          id: "h1",
          name: "HW",
          channelOffset: 2,
          channelMode: "stereo",
        },
      ]),
    ).toBe(false);
  });

  it("blocks hw_out repatch while playing (ADR 0017 §7)", () => {
    expect(
      isHwOutRepatchBlockedWhilePlaying(false, undefined, {
        kind: "hw_out",
        hwOutputId: "h1",
      }),
    ).toBe(false);
    expect(
      isHwOutRepatchBlockedWhilePlaying(true, undefined, {
        kind: "bus",
        busId: "b1",
      }),
    ).toBe(false);
    expect(
      isHwOutRepatchBlockedWhilePlaying(true, undefined, {
        kind: "hw_out",
        hwOutputId: "h1",
      }),
    ).toBe(true);
    expect(
      isHwOutRepatchBlockedWhilePlaying(
        true,
        { kind: "hw_out", hwOutputId: "h1" },
        { kind: "master" },
      ),
    ).toBe(true);
    expect(
      isHwOutRepatchBlockedWhilePlaying(
        true,
        { kind: "hw_out", hwOutputId: "h1" },
        { kind: "hw_out", hwOutputId: "h1" },
      ),
    ).toBe(false);
  });

  it("nextBusName increments", () => {
    expect(nextBusName([])).toBe("Bus 1");
    expect(nextBusName(["Bus 1", "Bus 3", "Vocals"])).toBe("Bus 4");
    expect(nextBusName(["bus 2", "Bus 2"])).toBe("Bus 3");
    expect(nextBusName(["  Bus 9  ", "Other"])).toBe("Bus 10");
  });

  it("isTrackRoutedToBus", () => {
    expect(
      isTrackRoutedToBus({ kind: "bus", busId: "b1" }, "b1", ["b1"]),
    ).toBe(true);
    expect(isTrackRoutedToBus({ kind: "master" }, "b1", ["b1"])).toBe(false);
  });

  it("channelMode helpers", () => {
    expect(ChannelModeSchema.parse("mono")).toBe("mono");
    expect(resolveChannelMode(undefined)).toBe("stereo");
    expect(channelModeFromChannelCount(1)).toBe("mono");
    expect(channelModeFromChannelCount(2)).toBe("stereo");
    expect(MAX_AUDIO_BUSSES).toBe(16);
  });

  it("Zod accepts AudioBus bus→bus + HW patch; rejects cycle on project", () => {
    const bus = AudioBusSchema.parse({
      id: "b1",
      name: "Bus 1",
      output: { kind: "bus", busId: "b2" },
    });
    expect(bus.output).toEqual({ kind: "bus", busId: "b2" });
    expect(
      MixerOutputDestSchema.parse({ kind: "hw_out", hwOutputId: "hw1" }).kind,
    ).toBe("hw_out");
    expect(
      AudioHardwareOutputSchema.parse({
        id: "hw1",
        name: "Out 3-4",
        channelOffset: 2,
        channelMode: "stereo",
      }).channelOffset,
    ).toBe(2);

    const seed = createProjectSeed("id", "Cycle", "2026-07-25T00:00:00.000Z");
    expect(() =>
      ProjectSchema.parse({
        ...seed,
        audioBusses: [
          { id: "a", name: "A", output: { kind: "bus", busId: "b" } },
          { id: "b", name: "B", output: { kind: "bus", busId: "a" } },
        ],
      }),
    ).toThrow(/acyclic|cycle/i);

    expect(
      ProjectSchema.parse({
        ...seed,
        audioBusses: [
          { id: "a", name: "A", output: { kind: "bus", busId: "b" } },
          { id: "b", name: "B" },
        ],
        audioTracks: [
          AudioTrackSchema.parse({
            id: "t1",
            name: "T",
            output: { kind: "bus", busId: "a" },
          }),
        ],
      }).audioBusses?.[0]?.output,
    ).toEqual({ kind: "bus", busId: "b" });
  });
});
