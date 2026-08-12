// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FormaClipInspector } from "./FormaClipInspector.js";
import type { Project, FormaClip } from "@stagesync/shared";

function createTestProject(): Project {
  return {
    id: "p1",
    name: "Test Song",
    formatVersion: 6 as const,
    updatedAt: new Date().toISOString(),
    ppq: 960,
    defaultBpm: 120,
    defaultMeter: { numerator: 4, denominator: 4 },
    forma: {
      clips: [
        {
          id: "cd1",
          name: "Countdown",
          kind: "countdown",
          startTicks: -3840,
          lengthTicks: 3840,
        },
        {
          id: "c1",
          name: "Verse 1",
          kind: "section",
          startTicks: 0,
          lengthTicks: 3840,
          note: "Soft intro",
        },
      ],
    },
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
}

describe("FormaClipInspector", () => {
  it("renders section inputs and handles name and note changes", () => {
    const project = createTestProject();
    const commitDraft = vi.fn();
    const onClipRename = vi.fn();
    const onCountdownBarsChange = vi.fn();

    const selectedClip = project.forma.clips[1] as FormaClip;

    render(
      <FormaClipInspector
        draftProject={project}
        commitDraft={commitDraft}
        selectedClip={selectedClip}
        selectedSubsectionRows={[]}
        selectedSubsectionIdx={null}
        setSelectedSubsectionIdx={vi.fn()}
        onClipRename={onClipRename}
        onCountdownBarsChange={onCountdownBarsChange}
      />,
    );

    const nameInput = screen.getByLabelText("Nazwa sekcji");
    expect((nameInput as HTMLInputElement).value).toBe("Verse 1");
    fireEvent.change(nameInput, { target: { value: "Chorus 1" } });
    expect(onClipRename).toHaveBeenCalledWith("Chorus 1");

    const noteInput = screen.getByLabelText("Notatka sekcji");
    expect((noteInput as HTMLTextAreaElement).value).toBe("Soft intro");
    fireEvent.change(noteInput, { target: { value: "Loud Chorus" } });
    expect(commitDraft).toHaveBeenCalled();
  });

  it("renders countdown clip options and handles bars dropdown change", () => {
    const project = createTestProject();
    const commitDraft = vi.fn();
    const onClipRename = vi.fn();
    const onCountdownBarsChange = vi.fn();

    const cdClip = project.forma.clips[0] as FormaClip;

    render(
      <FormaClipInspector
        draftProject={project}
        commitDraft={commitDraft}
        selectedClip={cdClip}
        selectedSubsectionRows={[]}
        selectedSubsectionIdx={null}
        setSelectedSubsectionIdx={vi.fn()}
        onClipRename={onClipRename}
        onCountdownBarsChange={onCountdownBarsChange}
      />,
    );

    expect(screen.getByText(/zablokowany Countdown/i)).toBeTruthy();
    const input = screen.getByLabelText("Długość Countdown w taktach");
    fireEvent.change(input, { target: { value: "2" } });
    expect(onCountdownBarsChange).toHaveBeenCalledWith("2");
  });
});
