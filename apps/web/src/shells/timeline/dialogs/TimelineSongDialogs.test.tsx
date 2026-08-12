// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import {
  TimelineSongDialogs,
  type TimelineSongDialogsProps,
} from "./TimelineSongDialogs.js";
import type { Project } from "@stagesync/shared";

function createDefaultProps(
  overrides?: Partial<TimelineSongDialogsProps>,
): TimelineSongDialogsProps {
  const dummyProject: Project = {
    id: "p1",
    name: "Test Song",
    formatVersion: 6 as const,
    updatedAt: new Date().toISOString(),
    ppq: 960,
    defaultBpm: 120,
    defaultMeter: { numerator: 4, denominator: 4 },
    forma: { clips: [] },
    tempoMap: [],
    meterMap: [],
    keyMap: [],
    akordy: { clips: [] },
    cue: { clips: [] },
    tekst: { clips: [] },
    melody: { clips: [] },
    scoreBarMap: { anchors: [] },
    audioTracks: [],
    audioClips: [],
    assets: [],
  };

  return {
    blocker: {
      state: "unblocked",
      reset: vi.fn(),
      proceed: vi.fn(),
    },
    projectId: "p1",
    draftProject: dummyProject,
    savePending: false,
    setSavePending: vi.fn(),
    setSavedProject: vi.fn(),
    setDraftProject: vi.fn(),
    setDraftHistory: vi.fn(),
    setLoadError: vi.fn(),
    onDiscard: vi.fn(),
    helpOpen: false,
    setHelpOpen: vi.fn(),
    songScreenOpen: false,
    setSongScreenOpen: vi.fn(),
    songScreenId: "song-screen-modal",
    libraryNames: [
      { id: "s1", name: "Song Alpha" },
      { id: "s2", name: "Song Beta" },
    ],
    songImportOpen: false,
    importAsNewSong: false,
    importApplying: false,
    importPreviewOptions: null,
    openSongImportWizard: vi.fn(),
    closeImportModals: vi.fn(),
    onImportUsUgBridge: vi.fn(),
    onImportUltrastar: vi.fn(),
    onImportUg: vi.fn(),
    ...overrides,
  };
}

describe("TimelineSongDialogs", () => {
  it("renders dirty guard blocker dialog and handles discard and cancel actions", () => {
    const reset = vi.fn();
    const proceed = vi.fn();
    const onDiscard = vi.fn();

    const props = createDefaultProps({
      blocker: {
        state: "blocked",
        reset,
        proceed,
      },
      onDiscard,
    });

    render(
      <MemoryRouter>
        <TimelineSongDialogs {...props} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Niezapisane zmiany")).toBeTruthy();
    expect(
      screen.getByText("Masz niezapisane zmiany. Opuścić Timeline bez zapisu?"),
    ).toBeTruthy();

    const cancelBtn = screen.getByText("Anuluj");
    fireEvent.click(cancelBtn);
    expect(reset).toHaveBeenCalled();

    const discardBtn = screen.getByText("Odrzuć i wyjdź");
    fireEvent.click(discardBtn);
    expect(onDiscard).toHaveBeenCalled();
    expect(proceed).toHaveBeenCalled();
  });

  it("renders help dialog when helpOpen is true", () => {
    const setHelpOpen = vi.fn();
    const props = createDefaultProps({
      helpOpen: true,
      setHelpOpen,
    });

    render(
      <MemoryRouter>
        <TimelineSongDialogs {...props} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("renders song picker list when songScreenOpen is true and allows closing", () => {
    const setSongScreenOpen = vi.fn();
    const props = createDefaultProps({
      songScreenOpen: true,
      setSongScreenOpen,
    });

    render(
      <MemoryRouter>
        <TimelineSongDialogs {...props} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Wybierz utwór")).toBeTruthy();
    expect(screen.getByText("Song Alpha")).toBeTruthy();
    expect(screen.getByText("Song Beta")).toBeTruthy();

    const closeButtons = screen.getAllByRole("button", { name: "Zamknij" });
    fireEvent.click(closeButtons[0]!);
    expect(setSongScreenOpen).toHaveBeenCalledWith(false);
  });
});
