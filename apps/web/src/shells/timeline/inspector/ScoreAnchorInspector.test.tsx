// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ScoreAnchorInspector } from "./ScoreAnchorInspector.js";
import type { Project, ScoreBarAnchor } from "@stagesync/shared";

describe("ScoreAnchorInspector", () => {
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
    scoreBarMap: { anchors: [{ id: "a-1", logicBar: 5, scoreBar: 12 }] },
    audioTracks: [],
    audioClips: [],
    assets: [],
  };

  const dummyAnchor: ScoreBarAnchor = {
    id: "a-1",
    logicBar: 5,
    scoreBar: 12,
  };

  it("renders inputs and updates anchor on change", () => {
    const commitDraft = vi.fn();

    render(
      <ScoreAnchorInspector
        draftProject={dummyProject}
        commitDraft={commitDraft}
        selectedAnchor={dummyAnchor}
      />,
    );

    expect(screen.getByText("Kotwica 5 → 12")).toBeTruthy();

    const logicInput = screen.getByLabelText(/Takt utworu/i);
    fireEvent.change(logicInput, { target: { value: "8" } });

    expect(commitDraft).toHaveBeenCalled();
  });
});
