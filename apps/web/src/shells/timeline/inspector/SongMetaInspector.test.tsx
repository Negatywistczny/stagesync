// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SongMetaInspector } from "./SongMetaInspector.js";
import type { Project } from "@stagesync/shared";

function createTestProject(): Project {
  return {
    id: "p1",
    name: "Song of the Century",
    artist: "Green Day",
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
}

describe("SongMetaInspector", () => {
  it("renders title and bpm inputs and handles edits", () => {
    const project = createTestProject();
    const commitDraft = vi.fn();
    const openSongImportWizard = vi.fn();

    render(
      <SongMetaInspector
        draftProject={project}
        commitDraft={commitDraft}
        openSongImportWizard={openSongImportWizard}
      />,
    );

    const titleInput = screen.getByLabelText("Tytuł utworu");
    expect((titleInput as HTMLInputElement).value).toBe("Song of the Century");

    fireEvent.change(titleInput, { target: { value: "American Idiot" } });
    expect(commitDraft).toHaveBeenCalled();

    const bpmInput = screen.getByLabelText("Tempo domyślne");
    expect((bpmInput as HTMLInputElement).value).toBe("120");

    fireEvent.change(bpmInput, { target: { value: "140" } });
    expect(commitDraft).toHaveBeenCalled();
  });

  it("handles MIDI Program Change edit and import wizard buttons", () => {
    const project = createTestProject();
    const commitDraft = vi.fn();
    const openSongImportWizard = vi.fn();

    render(
      <SongMetaInspector
        draftProject={project}
        commitDraft={commitDraft}
        openSongImportWizard={openSongImportWizard}
      />,
    );

    const pcInput = screen.getByLabelText("Program Change");
    fireEvent.change(pcInput, { target: { value: "12" } });
    expect(commitDraft).toHaveBeenCalled();

    const importBtn = screen.getByText("Importuj…");
    fireEvent.click(importBtn);
    expect(openSongImportWizard).toHaveBeenCalledWith(false);
  });
});
