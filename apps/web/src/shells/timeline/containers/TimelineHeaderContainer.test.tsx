// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { TimelineHeaderContainer } from "./TimelineHeaderContainer.js";
import type { Project } from "@stagesync/shared";

describe("TimelineHeaderContainer", () => {
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
    operatorNavCompact: false,
    draftProject: dummyProject,
    projectId: "p1",
    fullscreenButton: <button>Fullscreen</button>,
    APP_VERSION: "1.0.0",
    headerHistory: {
      canUndo: false,
      canRedo: false,
      dirty: false,
      savePending: false,
      onUndo: vi.fn(),
      onRedo: vi.fn(),
      onSave: vi.fn(),
      onDiscard: vi.fn(),
    },
    helpOpen: false,
    setHelpOpen: vi.fn(),
    shouldShowOperatorNav: () => true,
    pathname: "/timeline/p1",
    wsStatus: { isConnected: true },
    fullscreenError: null,
    timelineHeaderActions: <div>HeaderActions</div>,
    isMobilePreview: false,
    tools: [
      { id: "pointer", title: "Wskaźnik", Icon: () => <span>P</span> },
      { id: "pencil", title: "Ołówek", Icon: () => <span>E</span> },
    ],
    toolbarVisibleSet: new Set(["pointer", "pencil"]),
    tool: "pointer",
    onTool: vi.fn(),
    toolsVisBtnRef: { current: null },
    toolsVisOpen: false,
    toolsVisMenuId: "vis-menu",
    setToolsVisOpen: vi.fn(),
    commandPending: false,
    onStopClick: vi.fn(),
    state: "stopped",
    audioBuffering: false,
    onPauseClick: vi.fn(),
    onPlayClick: vi.fn(),
    clockLabel: "00:00.000",
    tempoAtPlayhead: 120,
    displayTicks: 0,
    openMapEdit: vi.fn(),
    timelineSurface: "lanes",
    setTimelineSurface: vi.fn(),
    loopOn: false,
    onLoopToggle: vi.fn(),
    meterAtPlayhead: { numerator: 4, denominator: 4 },
    metronomeOn: false,
    onMetronomeToggle: vi.fn(),
    followPlayhead: true,
    setFollowPlayhead: vi.fn(),
    showMidiPlayhead: false,
    setShowMidiPlayhead: vi.fn(),
    songMetaOpen: false,
    clearClipSelection: vi.fn(),
    clearMapSelection: vi.fn(),
    setInspectorVisible: vi.fn(),
    setSongMetaOpen: vi.fn(),
    prevSetlistId: null,
    nextSetlistId: null,
    songScreenOpen: false,
    setSongScreenOpen: vi.fn(),
    songScreenId: null,
    setlistEnabled: false,
    autoAdvance: false,
    patchSetlistAutoAdvance: vi.fn(),
    setAutoAdvance: vi.fn(),
  };

  it("renders header container with toolbar and title", () => {
    render(
      <MemoryRouter>
        <TimelineHeaderContainer {...baseProps} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("toolbar", { name: "Narzędzia" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Odtwarzanie" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Wskaźnik" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ołówek" })).toBeTruthy();
  });
});
