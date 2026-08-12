// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CueClipInspector } from "./CueClipInspector.js";
import type { Project, CueClip } from "@stagesync/shared";

function createTestProject(): { project: Project; cueClip: CueClip } {
  const cueClip: CueClip = {
    id: "cue1",
    label: "Wokal wejście",
    startTicks: 0,
    lengthTicks: 1920,
    roles: ["karaoke"],
    priority: "normal",
  };

  const project: Project = {
    id: "p1",
    name: "Cue Test Song",
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
    cue: { clips: [cueClip] },
    tekst: { clips: [] },
    melody: { clips: [] },
    scoreBarMap: { anchors: [] },
    audioTracks: [],
    audioClips: [],
    assets: [
      {
        id: "asset_beep",
        storageName: "beep.wav",
        originalName: "beep.wav",
        kind: "audio",
        mimeType: "audio/wav",
        sizeBytes: 512,
      },
    ],
  };

  return { project, cueClip };
}

describe("CueClipInspector", () => {
  it("renders label, priority, and allows editing", () => {
    const { project, cueClip } = createTestProject();
    const commitDraft = vi.fn();

    render(
      <CueClipInspector
        draftProject={project}
        commitDraft={commitDraft}
        selectedCueClip={cueClip}
        displayTicks={0}
        projectId="p1"
      />,
    );

    const labelInput = screen.getByLabelText("Etykieta cue");
    expect((labelInput as HTMLInputElement).value).toBe("Wokal wejście");

    fireEvent.change(labelInput, { target: { value: "Gitara solo" } });
    expect(commitDraft).toHaveBeenCalled();

    const prioritySelect = screen.getByLabelText("Priorytet cue");
    expect((prioritySelect as HTMLSelectElement).value).toBe("normal");

    fireEvent.change(prioritySelect, { target: { value: "alert" } });
    expect(commitDraft).toHaveBeenCalled();
  });

  it("handles role checkbox toggle and sample asset selection", () => {
    const { project, cueClip } = createTestProject();
    const commitDraft = vi.fn();

    render(
      <CueClipInspector
        draftProject={project}
        commitDraft={commitDraft}
        selectedCueClip={cueClip}
        displayTicks={0}
        projectId="p1"
      />,
    );

    const drumsCheckbox = screen.getByLabelText("drums");
    fireEvent.click(drumsCheckbox);
    expect(commitDraft).toHaveBeenCalled();

    const sampleSelect = screen.getByLabelText("Cue sample asset");
    fireEvent.change(sampleSelect, { target: { value: "asset_beep" } });
    expect(commitDraft).toHaveBeenCalled();
  });
});
