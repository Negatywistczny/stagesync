import { describe, expect, it } from "vitest";
import { hwOutputUiAllowed } from "@stagesync/shared";
import {
  getAudioHwCapability,
  refreshAudioHwCapability,
} from "./audioHwCapability.js";

describe("audioHwCapability", () => {
  it("defaults to stereo until probed", () => {
    const c = getAudioHwCapability();
    expect(c.maxChannelCount).toBeGreaterThanOrEqual(1);
    expect(c.uiAllowed).toBe(hwOutputUiAllowed(c.maxChannelCount));
  });

  it("refresh reads destination maxChannelCount from mock context", () => {
    const ctx = {
      destination: { maxChannelCount: 8 },
    } as AudioContext;
    const next = refreshAudioHwCapability(ctx);
    expect(next.maxChannelCount).toBe(8);
    expect(next.uiAllowed).toBe(true);
  });
});
