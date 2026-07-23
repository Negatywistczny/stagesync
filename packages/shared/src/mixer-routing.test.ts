import { describe, expect, it } from "vitest";
import {
  AudioBusSchema,
  ChannelModeSchema,
  MixerOutputDestSchema,
  MASTER_OUTPUT,
  MAX_AUDIO_BUSSES,
  channelModeFromChannelCount,
  isTrackRoutedToBus,
  nextBusName,
  resolveBusOutputDest,
  resolveChannelMode,
  resolveTrackOutputDest,
} from "./mixer-routing.js";
import { AudioTrackSchema, ProjectSchema } from "./schema.js";
import { createProjectSeed } from "./project-seed.js";

describe("mixer routing", () => {
  it("resolves omit / master / valid bus / stale busId", () => {
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
    expect(resolveBusOutputDest(undefined)).toEqual({ kind: "master" });
    expect(resolveBusOutputDest({ kind: "master" })).toEqual({
      kind: "master",
    });
  });

  it("nextBusName increments", () => {
    expect(nextBusName([])).toBe("Bus 1");
    expect(nextBusName(["Bus 1", "Bus 3", "Vocals"])).toBe("Bus 4");
  });

  it("isTrackRoutedToBus", () => {
    expect(
      isTrackRoutedToBus({ kind: "bus", busId: "b1" }, "b1", ["b1"]),
    ).toBe(true);
    expect(isTrackRoutedToBus(undefined, "b1", ["b1"])).toBe(false);
  });

  it("channelMode defaults and from channel count", () => {
    expect(ChannelModeSchema.parse("mono")).toBe("mono");
    expect(resolveChannelMode(undefined)).toBe("stereo");
    expect(resolveChannelMode("mono")).toBe("mono");
    expect(channelModeFromChannelCount(1)).toBe("mono");
    expect(channelModeFromChannelCount(0)).toBe("mono");
    expect(channelModeFromChannelCount(2)).toBe("stereo");
    expect(AudioTrackSchema.parse({ id: "t", name: "A" }).channelMode).toBe(
      undefined,
    );
    expect(
      AudioTrackSchema.parse({ id: "t", name: "A", channelMode: "mono" })
        .channelMode,
    ).toBe("mono");
    expect(
      AudioBusSchema.parse({ id: "b1", name: "Bus 1" }).channelMode,
    ).toBeUndefined();
    expect(
      AudioBusSchema.parse({
        id: "b1",
        name: "Bus 1",
        channelMode: "stereo",
      }).channelMode,
    ).toBe("stereo");
  });

  it("Zod accepts AudioBus + track output; rejects stale bus on project", () => {
    expect(MAX_AUDIO_BUSSES).toBe(16);
    const bus = AudioBusSchema.parse({ id: "b1", name: "Bus 1" });
    expect(bus.name).toBe("Bus 1");
    expect(
      MixerOutputDestSchema.parse({ kind: "bus", busId: "b1" }).kind,
    ).toBe("bus");
    expect(
      AudioTrackSchema.parse({
        id: "t1",
        name: "Gtr",
        output: { kind: "bus", busId: "b1" },
      }).output,
    ).toEqual({ kind: "bus", busId: "b1" });

    const seed = createProjectSeed("p", "Song", "2026-07-23T00:00:00.000Z");
    const ok = ProjectSchema.parse({
      ...seed,
      audioBusses: [{ id: "b1", name: "Bus 1" }],
      audioTracks: [
        {
          id: "t1",
          name: "Gtr",
          output: { kind: "bus", busId: "b1" },
        },
      ],
    });
    expect(ok.audioBusses).toHaveLength(1);

    expect(() =>
      ProjectSchema.parse({
        ...seed,
        audioTracks: [
          {
            id: "t1",
            name: "Gtr",
            output: { kind: "bus", busId: "missing" },
          },
        ],
      }),
    ).toThrow();
  });
});
