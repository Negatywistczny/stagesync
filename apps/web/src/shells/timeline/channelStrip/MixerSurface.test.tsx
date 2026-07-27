/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { createProjectSeed } from "@stagesync/shared";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/audioHwCapability.js", () => ({
  AUDIO_HW_CAPABILITY_EVENT: "stagesync-audio-hw-capability",
  getAudioHwCapability: () => ({ maxChannelCount: 2, uiAllowed: false }),
  refreshAudioHwCapability: () => ({ maxChannelCount: 2, uiAllowed: false }),
}));

vi.mock("./useMixerMeterLevels.js", () => ({
  useMixerMeterLevels: () => ({
    tracks: {},
    busses: {},
    hwOuts: {},
    master: {
      liveL: -60,
      liveR: -60,
      holdL: { holdDb: -60, clipped: false },
      holdR: { holdDb: -60, clipped: false },
    },
    click: {
      liveDb: -60,
      hold: { holdDb: -60, clipped: false },
    },
    clearTrackHold: () => {},
    clearBusHold: () => {},
    clearHwHold: () => {},
    clearMasterHold: () => {},
    clearClickHold: () => {},
  }),
}));

import { MixerSurface } from "./MixerSurface.js";

afterEach(() => {
  cleanup();
});

function emptyCallbacks() {
  return {
    onSelect: () => {},
    onSoloClick: () => {},
    onMuteClick: () => {},
    onGainChange: () => {},
    onGainReset: () => {},
  };
}

describe("MixerSurface", () => {
  it("names Mixer region, Audio/Busy zones, and Dodaj Bus", () => {
    const project = createProjectSeed(
      "song-1",
      "Test Song",
      "2026-07-26T00:00:00.000Z",
    );
    project.audioTracks = [];
    project.audioBusses = [];

    render(
      <MixerSurface
        project={project}
        trackSelection={{ ids: [], primaryId: null }}
        soloAudioTrackIds={[]}
        soloBusIds={[]}
        renamingTrackId={null}
        renameValue=""
        renamingBusId={null}
        busRenameValue=""
        buildCallbacks={() => emptyCallbacks()}
        buildBusCallbacks={() => emptyCallbacks()}
        masterCallbacks={{
          onGainChange: () => {},
          onGainReset: () => {},
        }}
        clickCallbacks={{ onMuteClick: () => {} }}
        clickMuted={false}
        playing={false}
        onAddBus={() => {}}
      />,
    );

    expect(screen.getByRole("region", { name: "Mixer" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Ścieżki audio" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Busy" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Wyjścia HW" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Dodaj Bus" })).toBeTruthy();
    expect(screen.getByText(/Brak ścieżek/)).toBeTruthy();
    expect(screen.getByText(/Multi-out wymaga/)).toBeTruthy();
  });
});
