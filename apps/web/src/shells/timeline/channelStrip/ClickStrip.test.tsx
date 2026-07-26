import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ClickStrip } from "./ClickStrip.js";

describe("ClickStrip", () => {
  const callbacks = {
    onMuteClick: () => {},
    onGainChange: () => {},
    onGainReset: () => {},
    onHoldClear: () => {},
  };

  it("names Click strip group, fader, meter, and mute", () => {
    const out = renderToStaticMarkup(
      <ClickStrip
        state={{ muted: false, gainDb: -6, meterDb: -20, hold: { db: -12, atMs: 1 } }}
        callbacks={callbacks}
      />,
    );
    expect(out).toContain('aria-label="Click"');
    expect(out).toContain('aria-label="Fader Click"');
    expect(out).toContain('aria-label="Miernik Click"');
    expect(out).toContain('aria-label="Wycisz Click (metronom)"');
    expect(out).toContain(
      'aria-label="Peak Hold Click — kliknij aby wyzerować"',
    );
  });

  it("flips mute label when Click is muted", () => {
    const out = renderToStaticMarkup(
      <ClickStrip
        state={{ muted: true, gainDb: 0, meterDb: -90, hold: { db: -90, atMs: 0 } }}
        callbacks={callbacks}
      />,
    );
    expect(out).toContain('aria-label="Włącz Click (metronom)"');
  });
});
