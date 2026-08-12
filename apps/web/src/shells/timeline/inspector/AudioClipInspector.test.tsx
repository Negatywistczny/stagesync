// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AudioClipInspector } from "./AudioClipInspector.js";
import type { Project, AudioClip } from "@stagesync/shared";

function createTestProject(): { project: Project; audioClip: AudioClip } {
  const audioClip: AudioClip = {
    id: "ac1",
    trackId: "at1",
    assetId: "asset1",
    startTicks: 0,
    lengthTicks: 3840,
    trimInMs: 100,
    trimOutMs: 200,
    gainDb: -3,
    fadeInMs: 50,
    fadeOutMs: 100,
    muted: false,
    loop: false,
  };

  const project: Project = {
    id: "p1",
    name: "Audio Test Song",
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
    audioTracks: [{ id: "at1", name: "Backing Track", order: 0, volume: 1, pan: 0, muted: false, solo: false }],
    audioClips: [audioClip],
    assets: [{ id: "asset1", name: "backing.mp3", originalName: "backing-track.mp3", mimeType: "audio/mpeg", size: 1024, path: "/assets/backing.mp3" }],
  };

  return { project, audioClip };
}

describe("AudioClipInspector", () => {
  it("renders asset name, mute checkbox, and handles mute toggle", () => {
    const { project, audioClip } = createTestProject();
    const commitDraft = vi.fn();

    render(
      <AudioClipInspector
        draftProject={project}
        commitDraft={commitDraft}
        selectedAudioClip={audioClip}
      />,
    );

    expect(screen.getByText("backing-track.mp3")).toBeTruthy();
    const muteCheckbox = screen.getByLabelText("Wycisz klip");
    expect((muteCheckbox as HTMLInputElement).checked).toBe(false);

    fireEvent.click(muteCheckbox);
    expect(commitDraft).toHaveBeenCalled();
  });

  it("handles trim in and trim out inputs", () => {
    const { project, audioClip } = createTestProject();
    const commitDraft = vi.fn();

    render(
      <AudioClipInspector
        draftProject={project}
        commitDraft={commitDraft}
        selectedAudioClip={audioClip}
      />,
    );

    const trimInInput = screen.getByLabelText("Trim początku (ms)");
    fireEvent.change(trimInInput, { target: { value: "300" } });
    expect(commitDraft).toHaveBeenCalled();

    const trimOutInput = screen.getByLabelText("Trim końca (ms)");
    fireEvent.change(trimOutInput, { target: { value: "500" } });
    expect(commitDraft).toHaveBeenCalled();
  });

  it("handles loop checkbox toggle", () => {
    const { project, audioClip } = createTestProject();
    const commitDraft = vi.fn();

    render(
      <AudioClipInspector
        draftProject={project}
        commitDraft={commitDraft}
        selectedAudioClip={audioClip}
      />,
    );

    const loopCheckbox = screen.getByLabelText("Pętla");
    fireEvent.click(loopCheckbox);
    expect(commitDraft).toHaveBeenCalled();
  });
});
