// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TimelineContentLaneRenderer } from "./TimelineContentLaneRenderer.js";
import type { Project } from "@stagesync/shared";

describe("TimelineContentLaneRenderer", () => {
  const dummyProject: Project = {
    id: "p1",
    name: "Song",
    formatVersion: 6,
    updatedAt: new Date().toISOString(),
    ppq: 960,
    defaultBpm: 120,
    defaultMeter: { numerator: 4, denominator: 4 },
    forma: {
      clips: [
        {
          id: "f1",
          name: "Verse",
          kind: "section",
          startTicks: 0,
          lengthTicks: 3840,
        },
      ],
    },
    tempoMap: [],
    meterMap: [],
    keyMap: [],
    akordy: {
      clips: [{ id: "ak1", symbol: "Am", startTicks: 0, lengthTicks: 1920 }],
    },
    tekst: {
      clips: [
        {
          id: "tx1",
          text: "Hello world",
          startTicks: 0,
          lengthTicks: 1920,
          blocks: [
            { id: "b1", text: "Hello world", startTicks: 0, lengthTicks: 1920 },
          ],
        },
      ],
    },
    melody: { clips: [] },
    cue: {
      clips: [
        { id: "cu1", label: "SOLO", startTicks: 0, lengthTicks: 1920 } as any,
      ],
    },
    scoreBarMap: { anchors: [] },
    audioTracks: [],
    audioClips: [],
    assets: [],
  };

  const baseProps = {
    draftProject: dummyProject,
    gestureSession: null,
    gesturePreview: null,
    clipSelection: { items: [], primaryId: null },
    primaryId: null,
    selectedSubsectionIdx: null,
    viewSpan: { start: 0, end: 7680 },
    barTicks: 1920,
    effectiveZoomH: 1,
    tool: "pointer" as const,
    tapActiveClipId: null,
    clearMapSelection: vi.fn(),
    openClipContextMenu: vi.fn(),
    selectLaneClip: vi.fn(),
    focusInspectorPanel: vi.fn(),
    onFormaClipPointerDown: vi.fn(),
    onContentClipPointerDown: vi.fn(),
    onFormaClipPointerMove: vi.fn(),
    onFormaClipPointerUp: vi.fn(),
  };

  it("renders forma lane clips and handles pointer down", () => {
    const onFormaClipPointerDown = vi.fn();
    render(
      <TimelineContentLaneRenderer
        {...baseProps}
        trackId="forma"
        onFormaClipPointerDown={onFormaClipPointerDown}
      />,
    );

    const clipBtn = screen.getByRole("button", { name: /Verse/i });
    expect(clipBtn).toBeTruthy();

    fireEvent.pointerDown(clipBtn);
    expect(onFormaClipPointerDown).toHaveBeenCalled();
  });

  it("renders tekst lane clips and handles pointer down and context menu", () => {
    const onContentClipPointerDown = vi.fn();
    const openClipContextMenu = vi.fn();

    render(
      <TimelineContentLaneRenderer
        {...baseProps}
        trackId="tekst"
        onContentClipPointerDown={onContentClipPointerDown}
        openClipContextMenu={openClipContextMenu}
      />,
    );

    const clipBtn = screen.getByRole("button", { name: /Hello world/i });
    expect(clipBtn).toBeTruthy();

    fireEvent.pointerDown(clipBtn);
    expect(onContentClipPointerDown).toHaveBeenCalled();

    fireEvent.contextMenu(clipBtn);
    expect(openClipContextMenu).toHaveBeenCalled();
  });

  it("renders akordy lane clips", () => {
    render(<TimelineContentLaneRenderer {...baseProps} trackId="akordy" />);

    expect(screen.getByRole("button", { name: /Am/i })).toBeTruthy();
  });

  it("renders cue lane clips", () => {
    render(<TimelineContentLaneRenderer {...baseProps} trackId="cue" />);

    expect(screen.getByRole("button", { name: /SOLO/i })).toBeTruthy();
  });
});
