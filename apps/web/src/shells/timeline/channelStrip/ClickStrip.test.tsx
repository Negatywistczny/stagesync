import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ClickStrip } from "./ClickStrip.js";

const hold = { holdDb: -60, clipped: false };

describe("ClickStrip", () => {
  it("names Click group and Mute with state-dependent PL labels", () => {
    const muted = renderToStaticMarkup(
      <ClickStrip
        state={{ muted: true, gainDb: 0, meterDb: -20, hold }}
        callbacks={{
          onMuteClick: () => {},
          onGainChange: () => {},
          onGainReset: () => {},
          onHoldClear: () => {},
        }}
      />,
    );
    expect(muted).toContain('aria-label="Click"');
    expect(muted).toContain('aria-label="Włącz Click (metronom)"');
    expect(muted).toContain('aria-label="Fader Click"');
    expect(muted).toContain('aria-label="Miernik Click"');

    const live = renderToStaticMarkup(
      <ClickStrip
        state={{ muted: false, gainDb: -3, meterDb: -12, hold }}
        callbacks={{
          onMuteClick: () => {},
          onGainChange: () => {},
          onGainReset: () => {},
          onHoldClear: () => {},
        }}
      />,
    );
    expect(live).toContain('aria-label="Wycisz Click (metronom)"');
  });
});
