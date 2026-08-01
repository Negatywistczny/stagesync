import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { emptyPeakHold } from "@stagesync/shared";
import { HwOutStrip } from "./HwOutStrip.js";

describe("HwOutStrip", () => {
  it("uses dual L/R peak meter for stereo patches", () => {
    const out = renderToStaticMarkup(
      <HwOutStrip
        id="hw1"
        name="HW 1"
        channelOffset={2}
        channelMode="stereo"
        gainDb={0}
        muted={false}
        meterDb={-9}
        meterDbR={-12}
        hold={emptyPeakHold()}
        onGainChange={() => {}}
        onGainReset={() => {}}
        onMuteClick={() => {}}
        onHoldClear={() => {}}
      />,
    );
    expect(out).toContain(">L<");
    expect(out).toContain(">R<");
    expect(out).toContain("ch 3–4");
  });

  it("uses a single meter column for mono patches", () => {
    const out = renderToStaticMarkup(
      <HwOutStrip
        id="hw1"
        name="HW 1"
        channelOffset={2}
        channelMode="mono"
        gainDb={0}
        muted={false}
        meterDb={-9}
        hold={emptyPeakHold()}
        onGainChange={() => {}}
        onGainReset={() => {}}
        onMuteClick={() => {}}
        onHoldClear={() => {}}
      />,
    );
    expect(out).not.toContain(">L<");
    expect(out).not.toContain(">R<");
    expect(out).toContain("ch 3");
  });
});
