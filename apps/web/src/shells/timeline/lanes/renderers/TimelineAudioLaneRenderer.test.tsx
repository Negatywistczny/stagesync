// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TimelineAudioLaneRenderer } from "./TimelineAudioLaneRenderer.js";
import type { Project } from "@stagesync/shared";

describe("TimelineAudioLaneRenderer", () => {
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
    audioTracks: [
      { id: "trk1", name: "Drums", muted: false, color: "#E74C3C" },
    ],
    audioClips: [
      {
        id: "ac1",
        trackId: "trk1",
        assetId: "ast1",
        startTicks: 0,
        lengthTicks: 3840,
        muted: false,
      },
    ],
    assets: [
      {
        id: "ast1",
        storageName: "ast1.wav",
        originalName: "drums.wav",
        kind: "audio",
        mimeType: "audio/wav",
        sizeBytes: 1000,
        durationMs: 4000,
        waveformPeaks: [0.1, 0.5, 0.9, 0.3],
      },
    ],
  };

  it("renders audio clip button and responds to pointer events and context menu", () => {
    const onAudioClipPointerDown = vi.fn();
    const onFormaClipPointerMove = vi.fn();
    const onFormaClipPointerUp = vi.fn();
    const openClipContextMenu = vi.fn();

    render(
      <TimelineAudioLaneRenderer
        lane="audio:trk1"
        draftProject={dummyProject}
        projectId="p1"
        failedAudioAssetIds={[]}
        gestureSession={null}
        gesturePreview={null}
        clipSelection={{ items: [], primaryId: null }}
        viewSpan={{ start: 0, end: 7680 }}
        barTicks={1920}
        effectiveZoomH={1}
        openClipContextMenu={openClipContextMenu}
        onAudioClipPointerDown={onAudioClipPointerDown}
        onFormaClipPointerMove={onFormaClipPointerMove}
        onFormaClipPointerUp={onFormaClipPointerUp}
      />,
    );

    const clipBtn = screen.getByRole("button", { name: /drums\.wav/i });
    expect(clipBtn).toBeTruthy();

    fireEvent.pointerDown(clipBtn);
    expect(onAudioClipPointerDown).toHaveBeenCalled();

    fireEvent.contextMenu(clipBtn);
    expect(openClipContextMenu).toHaveBeenCalled();
  });
});
