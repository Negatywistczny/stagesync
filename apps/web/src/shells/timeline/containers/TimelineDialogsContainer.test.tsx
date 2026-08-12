// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TimelineDialogsContainer } from "./TimelineDialogsContainer.js";
import type { Project } from "@stagesync/shared";

describe("TimelineDialogsContainer", () => {
  const dummyProject: Project = {
    id: "p1",
    name: "Song",
    formatVersion: 6,
    updatedAt: new Date().toISOString(),
    ppq: 960,
    defaultBpm: 120,
    defaultMeter: { numerator: 4, denominator: 4 },
    forma: { clips: [] },
    tempoMap: [],
    meterMap: [],
    keyMap: [],
    akordy: { clips: [] },
    tekst: { clips: [] },
    melody: { clips: [] },
    cue: { clips: [] },
    scoreBarMap: { anchors: [] },
    audioTracks: [],
    audioClips: [],
    assets: [],
  };

  const baseProps: any = {
    blocker: { state: "unblocked" },
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
    songScreenId: "sc1",
    libraryNames: [],
    songImportOpen: false,
    importAsNewSong: false,
    importApplying: false,
    importPreviewOptions: null,
    openSongImportWizard: vi.fn(),
    closeImportModals: vi.fn(),
    onImportUsUgBridge: vi.fn(),
    onImportUltrastar: vi.fn(),
    onImportUg: vi.fn(),
    eyeOpen: false,
    eyeMenuPos: null,
    eyeMenuRef: { current: null },
    eyeMenuId: "eye-id",
    trackVisibility: { forma: true } as any,
    toggleTrack: vi.fn(),
    toolsVisOpen: false,
    toolsVisMenuPos: null,
    toolsVisMenuRef: { current: null },
    toolsVisMenuId: "tools-vis",
    toolbarVisibleSet: new Set(["pointer"]),
    setToolbarVisibleTools: vi.fn(),
    toolMenu: null,
    toolMenuRef: { current: null },
    tool: "pointer" as const,
    onTool: vi.fn(),
    wandMenu: null,
    wandMenuRef: { current: null },
    applyWand: vi.fn(),
    displayTicks: 0,
    mapEditTicks: 0,
    commitDraft: vi.fn(),
    tempoEditOpen: false,
    setTempoEditOpen: vi.fn(),
    tempoEditTitleId: "tempo-title",
    tempoDraft: "120",
    setTempoDraft: vi.fn(),
    meterEditOpen: false,
    setMeterEditOpen: vi.fn(),
    meterEditTitleId: "meter-title",
    meterNumDraft: "4",
    setMeterNumDraft: vi.fn(),
    meterDenDraft: "4",
    setMeterDenDraft: vi.fn(),
    keyEditOpen: false,
    setKeyEditOpen: vi.fn(),
    keyEditTitleId: "key-title",
    touchAlertOpen: false,
    setTouchAlertOpen: vi.fn(),
  };

  it("renders container without crashing when modals are closed", () => {
    const { container } = render(<TimelineDialogsContainer {...baseProps} />);
    expect(container).toBeTruthy();
  });

  it("renders tempo modal when tempoEditOpen is true", () => {
    render(<TimelineDialogsContainer {...baseProps} tempoEditOpen={true} />);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText(/Tempo @/i)).toBeTruthy();
    expect(screen.getByLabelText(/BPM/i)).toBeTruthy();
  });
});
