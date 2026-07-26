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
});
