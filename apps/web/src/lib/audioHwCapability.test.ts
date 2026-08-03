import { describe, expect, it } from "vitest";
import { hwOutputUiAllowed } from "@stagesync/shared";
import {
  applyDestinationChannelLayout,
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

  it("stereo / inactive multi-out stays speakers (not discrete)", () => {
    const dest = {
      maxChannelCount: 2,
      channelCount: 2,
      channelCountMode: "explicit",
      channelInterpretation: "discrete",
    };
    const n = applyDestinationChannelLayout(
      { destination: dest } as unknown as AudioContext,
      2,
      false,
    );
    expect(n).toBe(2);
    expect(dest.channelCount).toBe(2);
    expect(dest.channelCountMode).toBe("explicit");
    expect(dest.channelInterpretation).toBe("speakers");
  });

  it("does not re-write destination when speakers stereo already set", () => {
    let writes = 0;
    const dest = {
      maxChannelCount: 2,
      _channelCount: 2,
      channelCountMode: "explicit",
      channelInterpretation: "speakers",
      get channelCount() {
        return this._channelCount;
      },
      set channelCount(v: number) {
        writes += 1;
        this._channelCount = v;
      },
    };
    applyDestinationChannelLayout(
      { destination: dest } as unknown as AudioContext,
      2,
      false,
    );
    expect(writes).toBe(0);
  });

  it("capable device without active multi-out stays speakers", () => {
    const dest = {
      maxChannelCount: 8,
      channelCount: 8,
      channelCountMode: "explicit",
      channelInterpretation: "discrete",
    };
    const n = applyDestinationChannelLayout(
      { destination: dest } as unknown as AudioContext,
      8,
      false,
    );
    expect(n).toBe(2);
    expect(dest.channelInterpretation).toBe("speakers");
    expect(dest.channelCount).toBe(2);
  });

  it("active multi-out expands discrete channel count", () => {
    const dest = {
      maxChannelCount: 8,
      channelCount: 2,
      channelCountMode: "explicit",
      channelInterpretation: "speakers",
    };
    const n = applyDestinationChannelLayout(
      { destination: dest } as unknown as AudioContext,
      8,
      true,
    );
    expect(n).toBe(8);
    expect(dest.channelCount).toBe(8);
    expect(dest.channelCountMode).toBe("explicit");
    expect(dest.channelInterpretation).toBe("discrete");
  });
});
