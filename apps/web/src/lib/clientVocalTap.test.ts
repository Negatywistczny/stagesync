import { describe, expect, it } from "vitest";
import { createProjectV5Seed } from "@stagesync/shared";
import { applyVocalTap, vocalTapQueue } from "./clientVocalTap.js";

describe("clientVocalTap", () => {
  it("queues non-empty tekst clips on/after content floor", () => {
    const base = createProjectV5Seed(
      "p",
      "S",
      "2026-07-23T00:00:00.000Z",
    );
    const project = {
      ...base,
      tekst: {
        clips: [
          {
            id: "t-empty",
            text: "   ",
            startTicks: 0,
            lengthTicks: 960,
          },
          {
            id: "t-late",
            text: "two",
            startTicks: 3840,
            lengthTicks: 960,
          },
          {
            id: "t-early",
            text: "one",
            startTicks: 0,
            lengthTicks: 960,
          },
          {
            id: "t-preroll",
            text: "skip",
            startTicks: -1000,
            lengthTicks: 960,
          },
        ],
      },
    };
    const queue = vocalTapQueue(project);
    expect(queue.map((c) => c.id)).toEqual(["t-early", "t-late"]);
  });

  it("applyVocalTap moves clip start with floor / min clamp", () => {
    const base = createProjectV5Seed(
      "p",
      "S",
      "2026-07-23T00:00:00.000Z",
    );
    const project = {
      ...base,
      tekst: {
        clips: [
          {
            id: "line",
            text: "hi",
            startTicks: 0,
            lengthTicks: 1920,
          },
        ],
      },
    };
    const moved = applyVocalTap(project, "line", 5000, 4000);
    expect(moved.tekst.clips[0]!.startTicks).toBe(5000);
    expect(moved.tekst.clips[0]!.lengthTicks).toBe(1920);

    const clamped = applyVocalTap(project, "line", 100, 2000);
    expect(clamped.tekst.clips[0]!.startTicks).toBe(2000);
  });
});
