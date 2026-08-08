/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createProjectSeed } from "@stagesync/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hwCap = vi.hoisted(() => ({
  maxChannelCount: 2,
  uiAllowed: false,
}));

vi.mock("@lib/audio/audioHwCapability.js", () => ({
  AUDIO_HW_CAPABILITY_EVENT: "stagesync-audio-hw-capability",
  getAudioHwCapability: () => ({ ...hwCap }),
  refreshAudioHwCapability: () => ({ ...hwCap }),
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

import { MIXER_ZONE_VISIBILITY_KEY } from "@lib/client/mixerZoneVisibility.js";
import { MixerSurface } from "./MixerSurface.js";
import styles from "./MixerSurface.module.css";

function stubLocalStorage(initial: Record<string, string> = {}) {
  const store = { ...initial };
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => (k in store ? store[k]! : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    _store: store,
  });
  return store;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  hwCap.maxChannelCount = 2;
  hwCap.uiAllowed = false;
  stubLocalStorage();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
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

function renderMixer(
  overrides: Partial<{
    onAddAudioTrack: () => void;
    onAddBus: () => void;
    onAddHwOut: () => void;
  }> = {},
) {
  const project = createProjectSeed(
    "song-1",
    "Test Song",
    "2026-07-26T00:00:00.000Z",
  );
  project.audioTracks = [
    {
      id: "trk-1",
      name: "Track A",
      muted: false,
      gainDb: 0,
      pan: 0,
      channelMode: "stereo",
    },
  ];
  project.audioBusses = [
    {
      id: "bus-1",
      name: "Bus 1",
      muted: false,
      gainDb: 0,
      pan: 0,
      channelMode: "stereo",
      output: { type: "master" },
    },
  ];
  return render(
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
      onAddAudioTrack={overrides.onAddAudioTrack ?? (() => {})}
      onAddBus={overrides.onAddBus ?? (() => {})}
      onAddHwOut={overrides.onAddHwOut}
    />,
  );
}

describe("MixerSurface", () => {
  it("names Mixer region, Audio/Busy zones, and add buttons", () => {
    const onAddAudioTrack = vi.fn();
    const onAddBus = vi.fn();

    renderMixer({ onAddAudioTrack, onAddBus });

    expect(screen.getByRole("region", { name: "Mixer" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Ścieżki audio" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Busy" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Wyjścia HW" })).toBeNull();
    expect(screen.getByRole("button", { name: "Dodaj Ścieżkę" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Dodaj Bus" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Dodaj Ścieżkę" }).textContent).toBe(
      "+ Dodaj",
    );
    expect(screen.getByRole("button", { name: "Dodaj Bus" }).textContent).toBe(
      "+ Dodaj",
    );
    expect(screen.queryByText(/Brak ścieżek/)).toBeNull();
    expect(screen.queryByText(/Brak busów/)).toBeNull();
    expect(screen.queryByText(/Multi-out wymaga/)).toBeNull();
    expect(screen.queryByText(/Quad\/5\.1/)).toBeNull();

    screen.getByRole("button", { name: "Dodaj Ścieżkę" }).click();
    expect(onAddAudioTrack).toHaveBeenCalledTimes(1);
    screen.getByRole("button", { name: "Dodaj Bus" }).click();
    expect(onAddBus).toHaveBeenCalledTimes(1);
  });

  it("keeps zone divider between Busy and HW Out; flush only last scroll zone", () => {
    hwCap.maxChannelCount = 8;
    hwCap.uiAllowed = true;

    renderMixer({ onAddHwOut: () => {} });

    const audio = screen.getByRole("region", { name: "Ścieżki audio" });
    const busy = screen.getByRole("region", { name: "Busy" });
    const hw = screen.getByRole("region", { name: "Wyjścia HW" });

    expect(audio.className.split(/\s+/)).toContain(styles.zone);
    expect(audio.className.split(/\s+/)).not.toContain(styles.busZone);
    expect(busy.className.split(/\s+/)).toContain(styles.zone);
    expect(busy.className.split(/\s+/)).not.toContain(styles.busZone);
    expect(hw.className.split(/\s+/)).toContain(styles.zone);
    expect(hw.className.split(/\s+/)).toContain(styles.busZone);
  });

  it("flushes Busy when HW Out zone is hidden", () => {
    renderMixer();

    const busy = screen.getByRole("region", { name: "Busy" });
    expect(busy.className.split(/\s+/)).toContain(styles.busZone);
  });

  it("toggles zone faders with eye while keeping compact headers", () => {
    renderMixer();

    expect(screen.getByTitle("Track A")).toBeTruthy();
    expect(screen.getByTitle("Bus 1")).toBeTruthy();
    expect(screen.getByRole("group", { name: "Stereo Out" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Ukryj strefę Audio" }));
    expect(screen.queryByTitle("Track A")).toBeNull();
    expect(screen.queryByRole("button", { name: "Dodaj Ścieżkę" })).toBeNull();
    expect(screen.getByRole("button", { name: "Pokaż strefę Audio" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Ścieżki audio" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Ukryj strefę Busy" }));
    expect(screen.queryByTitle("Bus 1")).toBeNull();
    expect(screen.getByRole("button", { name: "Pokaż strefę Busy" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Ukryj strefę Master" }));
    expect(screen.queryByRole("group", { name: "Stereo Out" })).toBeNull();
    expect(screen.getByRole("button", { name: "Pokaż strefę Master" })).toBeTruthy();

    const stored = JSON.parse(
      localStorage.getItem(MIXER_ZONE_VISIBILITY_KEY) ?? "{}",
    );
    expect(stored).toMatchObject({
      audio: false,
      bus: false,
      master: false,
      hw: true,
    });

    fireEvent.click(screen.getByRole("button", { name: "Pokaż strefę Audio" }));
    expect(screen.getByTitle("Track A")).toBeTruthy();
  });

  it("restores zone visibility from localStorage", () => {
    localStorage.setItem(
      MIXER_ZONE_VISIBILITY_KEY,
      JSON.stringify({ audio: false, bus: true, hw: true, master: true }),
    );
    renderMixer();
    expect(screen.queryByTitle("Track A")).toBeNull();
    expect(screen.getByRole("button", { name: "Pokaż strefę Audio" })).toBeTruthy();
    expect(screen.getByTitle("Bus 1")).toBeTruthy();
  });

  it("toggles HW Out zone eye when multi-out is allowed", () => {
    hwCap.maxChannelCount = 8;
    hwCap.uiAllowed = true;
    renderMixer({ onAddHwOut: () => {} });

    expect(screen.getByRole("region", { name: "Wyjścia HW" })).toBeTruthy();
    expect(screen.queryByText(/Brak patchy HW/)).toBeNull();
    expect(screen.getByRole("button", { name: "Dodaj wyjście HW" }).textContent).toBe(
      "+ Dodaj",
    );
    fireEvent.click(screen.getByRole("button", { name: "Ukryj strefę HW Out" }));
    expect(screen.queryByRole("button", { name: "Dodaj wyjście HW" })).toBeNull();
    expect(screen.getByRole("button", { name: "Pokaż strefę HW Out" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Wyjścia HW" })).toBeTruthy();
  });

  it("disables Add HW when device channel budget is exhausted", () => {
    hwCap.maxChannelCount = 4;
    hwCap.uiAllowed = true;
    const project = createProjectSeed(
      "song-1",
      "Test Song",
      "2026-07-26T00:00:00.000Z",
    );
    project.audioHardwareOutputs = [
      {
        id: "hw-1",
        name: "HW 1",
        channelOffset: 2,
        channelMode: "stereo",
      },
    ];
    const onAddHwOut = vi.fn();
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
        onAddAudioTrack={() => {}}
        onAddBus={() => {}}
        onAddHwOut={onAddHwOut}
      />,
    );
    const addHw = screen.getByRole("button", { name: "Dodaj wyjście HW" });
    expect(addHw).toHaveProperty("disabled", true);
    expect(addHw.getAttribute("title")).toMatch(/Brak wolnych kanałów/);
    fireEvent.click(addHw);
    expect(onAddHwOut).not.toHaveBeenCalled();
  });
});
