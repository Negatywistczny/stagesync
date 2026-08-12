// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AkordClipInspector } from "./AkordClipInspector.js";
import type { Project, AkordClip } from "@stagesync/shared";

function createTestProject(): { project: Project; akordClip: AkordClip } {
  const akordClip: AkordClip = {
    id: "ak1",
    symbol: "Am7",
    startTicks: 0,
    lengthTicks: 1920,
  };

  const project: Project = {
    id: "p1",
    name: "Akord Test Song",
    formatVersion: 6 as const,
    updatedAt: new Date().toISOString(),
    ppq: 960,
    defaultBpm: 120,
    defaultMeter: { numerator: 4, denominator: 4 },
    forma: { clips: [] },
    tempoMap: [],
    meterMap: [],
    keyMap: [],
    akordy: { clips: [akordClip] },
    cue: { clips: [] },
    tekst: { clips: [] },
    melody: { clips: [] },
    scoreBarMap: { anchors: [] },
    audioTracks: [],
    audioClips: [],
    assets: [],
  };

  return { project, akordClip };
}

describe("AkordClipInspector", () => {
  it("renders chord symbol and handles change and blur", () => {
    const { project, akordClip } = createTestProject();
    const commitDraft = vi.fn();

    render(
      <AkordClipInspector
        draftProject={project}
        commitDraft={commitDraft}
        selectedAkordClip={akordClip}
      />,
    );

    const input = screen.getByLabelText("Symbol akordu");
    expect((input as HTMLInputElement).value).toBe("Am7");

    fireEvent.change(input, { target: { value: "Cmaj7" } });
    expect(commitDraft).toHaveBeenCalled();

    fireEvent.blur(input);
    expect(commitDraft).toHaveBeenCalled();
  });

  it("handles Enter key press to blur input", () => {
    const { project, akordClip } = createTestProject();
    const commitDraft = vi.fn();

    render(
      <AkordClipInspector
        draftProject={project}
        commitDraft={commitDraft}
        selectedAkordClip={akordClip}
      />,
    );

    const input = screen.getByLabelText("Symbol akordu");
    const blurSpy = vi.spyOn(input, "blur");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(blurSpy).toHaveBeenCalled();
  });
});
