// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TekstClipInspector } from "./TekstClipInspector.js";
import type { Project, TekstClip } from "@stagesync/shared";

function createTestProject(): { project: Project; tekstClip: TekstClip } {
  const tekstClip: TekstClip = {
    id: "txt1",
    text: "Ale wkoło jest wesoło",
    startTicks: 3840,
    lengthTicks: 3840,
    blocks: [
      {
        id: "tb1",
        text: "Ale wkoło jest wesoło",
        startTicks: 3840,
        lengthTicks: 3840,
      },
    ],
  };

  const project: Project = {
    id: "p1",
    name: "Tekst Test Song",
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
    tekst: { clips: [tekstClip] },
    melody: { clips: [] },
    scoreBarMap: { anchors: [] },
    audioTracks: [],
    audioClips: [],
    assets: [],
  };

  return { project, tekstClip };
}

describe("TekstClipInspector", () => {
  it("renders text area and handles text edit", () => {
    const { project, tekstClip } = createTestProject();
    const commitDraft = vi.fn();

    render(
      <TekstClipInspector
        draftProject={project}
        commitDraft={commitDraft}
        selectedTekstClip={tekstClip}
      />,
    );

    const textarea = screen.getByLabelText("Tekst linii");
    expect((textarea as HTMLTextAreaElement).value).toBe(
      "Ale wkoło jest wesoło",
    );

    fireEvent.change(textarea, { target: { value: "Nowy wers piosenki" } });
    expect(commitDraft).toHaveBeenCalled();
  });

  it("handles start bar.beat onBlur edit", () => {
    const { project, tekstClip } = createTestProject();
    const commitDraft = vi.fn();

    render(
      <TekstClipInspector
        draftProject={project}
        commitDraft={commitDraft}
        selectedTekstClip={tekstClip}
      />,
    );

    const startInput = screen.getByLabelText("Start tekstu (takt.beat)");
    fireEvent.change(startInput, { target: { value: "3.1" } });
    fireEvent.blur(startInput);

    expect(commitDraft).toHaveBeenCalled();
  });
});
