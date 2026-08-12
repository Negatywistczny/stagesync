// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AudioTrackInspector } from "./AudioTrackInspector.js";
import type { Project, AudioTrack } from "@stagesync/shared";

function createTestProject(): { project: Project; audioTrack: AudioTrack } {
  const audioTrack: AudioTrack = {
    id: "at1",
    name: "Lead Vocal",
    order: 0,
    volume: 1,
    pan: 0,
    gainDb: -6,
    muted: false,
    solo: false,
  };

  const project: Project = {
    id: "p1",
    name: "Track Test Song",
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
    audioTracks: [audioTrack],
    audioClips: [],
    assets: [],
  };

  return { project, audioTrack };
}

describe("AudioTrackInspector", () => {
  it("renders track name and handles name edit", () => {
    const { project, audioTrack } = createTestProject();
    const commitDraft = vi.fn();
    const onUploadAudioToTrack = vi.fn().mockResolvedValue(undefined);

    render(
      <AudioTrackInspector
        draftProject={project}
        commitDraft={commitDraft}
        selectedDockAudioTrack={audioTrack}
        audioUploadPending={false}
        onUploadAudioToTrack={onUploadAudioToTrack}
      />,
    );

    const nameInput = screen.getByLabelText("Nazwa ścieżki");
    expect((nameInput as HTMLInputElement).value).toBe("Lead Vocal");

    fireEvent.change(nameInput, { target: { value: "Lead Vocal Dub" } });
    expect(commitDraft).toHaveBeenCalled();
  });

  it("handles double click reset to 0dB", () => {
    const { project, audioTrack } = createTestProject();
    const commitDraft = vi.fn();
    const onUploadAudioToTrack = vi.fn().mockResolvedValue(undefined);

    render(
      <AudioTrackInspector
        draftProject={project}
        commitDraft={commitDraft}
        selectedDockAudioTrack={audioTrack}
        audioUploadPending={false}
        onUploadAudioToTrack={onUploadAudioToTrack}
      />,
    );

    const resetTarget = screen.getByTitle("Dwuklik — 0.0 dB");
    fireEvent.doubleClick(resetTarget);
    expect(commitDraft).toHaveBeenCalled();
  });
});
