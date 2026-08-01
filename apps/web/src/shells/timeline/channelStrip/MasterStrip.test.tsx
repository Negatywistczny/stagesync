import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MasterStrip } from "./MasterStrip.js";

const hold = { holdDb: -12, clipped: false };

describe("MasterStrip", () => {
  it("names Stereo Out group, fader, Peak Hold, and meter", () => {
    const out = renderToStaticMarkup(
      <MasterStrip
        state={{
          gainDb: -3,
          meterL: -9,
          meterR: -11,
          holdL: hold,
          holdR: { holdDb: -10, clipped: true },
        }}
        callbacks={{
          onGainChange: () => {},
          onGainReset: () => {},
          onHoldClear: () => {},
        }}
      />,
    );
    expect(out).toContain('aria-label="Stereo Out"');
    expect(out).toContain('aria-label="Fader Stereo Out"');
    expect(out).toContain(
      'aria-label="Peak Hold Stereo Out — kliknij aby wyzerować"',
    );
    expect(out).toContain('aria-label="Miernik Stereo Out"');
    expect(out).toContain(">L<");
    expect(out).toContain(">R<");
  });

  it("renders Master Out selector when multi-out options are provided", () => {
    const out = renderToStaticMarkup(
      <MasterStrip
        state={{
          gainDb: 0,
          meterL: -60,
          meterR: -60,
          holdL: hold,
          holdR: hold,
          outputValue: "ch:0",
          outputOptions: [
            { value: "ch:0", label: "CH 1–2" },
            { value: "ch:2", label: "CH 3–4" },
          ],
        }}
        callbacks={{
          onGainChange: () => {},
          onGainReset: () => {},
          onOutputChange: () => {},
        }}
      />,
    );
    expect(out).toContain('aria-label="Out Master"');
    expect(out).toContain("CH 1–2");
    expect(out).toContain("CH 3–4");
  });
});
