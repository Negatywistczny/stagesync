import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChannelStripControls } from "./ChannelStripControls.js";
import type {
  ChannelStripCallbacks,
  ChannelStripState,
} from "./channelStripTypes.js";

const strip: ChannelStripState = {
  trackId: "t1",
  name: "Backing Vox",
  muted: false,
  soloed: false,
  selected: false,
  gainDb: -3,
  pan: 0,
};

const callbacks: ChannelStripCallbacks = {
  onSelect: () => {},
  onSoloClick: () => {},
  onMuteClick: () => {},
  onGainChange: () => {},
  onGainReset: () => {},
};

describe("ChannelStripControls", () => {
  it("names Solo / Mute / fader for dock layout", () => {
    const out = renderToStaticMarkup(
      <ChannelStripControls
        strip={strip}
        callbacks={callbacks}
        layout="dock"
      />,
    );
    expect(out).toContain('aria-label="Solo ścieżki"');
    expect(out).toContain('aria-label="Wycisz ścieżkę"');
    expect(out).toContain('aria-label="Fader Backing Vox"');
    expect(out).toContain('aria-label="Kolor i ikona ścieżki"');
  });

  it("flips Solo / Mute labels when active", () => {
    const out = renderToStaticMarkup(
      <ChannelStripControls
        strip={{ ...strip, soloed: true, muted: true }}
        callbacks={callbacks}
        layout="dock"
      />,
    );
    expect(out).toContain('aria-label="Wyłącz solo"');
    expect(out).toContain('aria-label="Włącz ścieżkę"');
  });

  it("exposes channel-mode group labels in mixer layout", () => {
    const out = renderToStaticMarkup(
      <ChannelStripControls
        strip={strip}
        callbacks={callbacks}
        layout="mixer"
      />,
    );
    expect(out).toContain('aria-label="Tryb kanału Backing Vox"');
    expect(out).toContain('aria-label="Tryb mono"');
    expect(out).toContain('aria-label="Tryb stereo"');
    expect(out).toContain('aria-label="Solo ścieżki"');
    expect(out).toContain('aria-label="Wycisz ścieżkę"');
  });

  it("labels rename input when renaming", () => {
    const out = renderToStaticMarkup(
      <ChannelStripControls
        strip={strip}
        callbacks={callbacks}
        layout="dock"
        renaming
        renameValue="Draft"
      />,
    );
    expect(out).toContain('aria-label="Nazwa ścieżki Backing Vox"');
  });
});
