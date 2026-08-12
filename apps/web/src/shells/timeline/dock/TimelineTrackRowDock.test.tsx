// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TimelineTrackRowDock, type TimelineTrackRowDockProps } from "./TimelineTrackRowDock.js";
import type { Project } from "@stagesync/shared";
import styles from "../TimelineShell.module.css";

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

function createDefaultProps(overrides?: Partial<TimelineTrackRowDockProps>): TimelineTrackRowDockProps {
  const dummyProject: Project = {
    id: "p1",
    name: "Dock Test Song",
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
    audioTracks: [
      {
        id: "at1",
        name: "Drums Track",
        order: 0,
        volume: 1,
        pan: 0,
        gainDb: 0,
        muted: false,
        solo: false,
      },
    ],
    audioClips: [],
    assets: [],
  };

  return {
    track: {
      id: "track_audio_at1",
      label: "Drums Track",
      group: "audio",
      audioTrackId: "at1",
    },
    draftProject: dummyProject,
    trackSelection: {
      primaryId: "at1",
      ids: ["at1"],
    },
    soloAudioTrackIds: [],
    trackRename: null,
    buildChannelStripCallbacks: () => ({
      onToggleMute: vi.fn(),
      onToggleSolo: vi.fn(),
      onGainChange: vi.fn(),
      onPanChange: vi.fn(),
      onNameChange: vi.fn(),
      onSelect: vi.fn(),
    }),
    laneHeights: {},
    zoomV: 1,
    uiScale: 1,
    tool: "pointer",
    onTool: vi.fn(),
    isMobilePreview: false,
    touchTier: "desktop",
    laneResizeTrackId: null,
    beginLaneResize: vi.fn(),
    onLaneResizePointerMove: vi.fn(),
    endLaneResize: vi.fn(),
    onLaneResizeDblClick: vi.fn(),
    onAudioTrackHeaderClick: vi.fn(),
    openAudioTrackContextMenu: vi.fn(),
    ...overrides,
  };
}

describe("TimelineTrackRowDock", () => {
  it("renders audio track dock cell and handles header click and context menu", () => {
    const onAudioTrackHeaderClick = vi.fn();
    const openAudioTrackContextMenu = vi.fn();

    const props = createDefaultProps({
      onAudioTrackHeaderClick,
      openAudioTrackContextMenu,
    });

    render(<TimelineTrackRowDock {...props} />);

    const container = document.querySelector(`.${styles.dockCell}`) as HTMLElement;
    fireEvent.click(container);
    expect(onAudioTrackHeaderClick).toHaveBeenCalled();

    fireEvent.contextMenu(container, { clientX: 100, clientY: 200 });
    expect(openAudioTrackContextMenu).toHaveBeenCalledWith("at1", 100, 200);
  });

  it("renders standard non-audio track dock cell", () => {
    const onTool = vi.fn();
    const props = createDefaultProps({
      track: {
        id: "track_forma",
        label: "Forma",
        group: "forma",
      },
      onTool,
    });

    render(<TimelineTrackRowDock {...props} />);

    expect(screen.getByText("Forma")).toBeTruthy();
  });
});
