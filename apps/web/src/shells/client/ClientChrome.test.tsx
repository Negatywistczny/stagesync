// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ClientChrome } from "./ClientChrome.js";
import type { ClientDisplayPrefs } from "@lib/client/clientDisplayPrefs.js";

describe("ClientChrome", () => {
  const dummyPrefs: ClientDisplayPrefs = {
    clockFormat: "bbt",
    karaokeRomanized: false,
    colorProfile: "default",
    chordsRomanized: false,
  };

  it("renders song title, connection indicator, and triggers settings toggle", () => {
    const onToggleGlobalSettings = vi.fn();
    const onCloseGlobalSettings = vi.fn();
    const onFullscreen = vi.fn();
    const onDisplayPrefsChange = vi.fn();

    render(
      <MemoryRouter>
        <ClientChrome
          wsStatus="connected"
          latencyMs={12}
          started={true}
          songTitle="Billie Jean"
          bbt={{ bar: 1, beat: 2 }}
          transportError={null}
          globalSettingsOpen={false}
          onToggleGlobalSettings={onToggleGlobalSettings}
          onCloseGlobalSettings={onCloseGlobalSettings}
          onFullscreen={onFullscreen}
          displayPrefs={dummyPrefs}
          onDisplayPrefsChange={onDisplayPrefsChange}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Billie Jean")).toBeTruthy();

    const settingsBtn = screen.getByRole("button", {
      name: "Ustawienia globalne",
    });
    fireEvent.click(settingsBtn);
    expect(onToggleGlobalSettings).toHaveBeenCalled();

    const fullscreenBtn = screen.getByRole("button", { name: "Pełny ekran" });
    fireEvent.click(fullscreenBtn);
    expect(onFullscreen).toHaveBeenCalled();
  });
});
