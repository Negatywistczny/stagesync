// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimelineMapEdits } from "./useTimelineMapEdits.js";
import type { Project } from "@stagesync/shared";

describe("useTimelineMapEdits", () => {
  const dummyProject: Project = {
    id: "p1",
    name: "Map Song",
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

  it("opens tempo and meter edit dialogs with correct values", () => {
    const commitDraft = vi.fn();
    const { result } = renderHook(() =>
      useTimelineMapEdits({
        draftProject: dummyProject,
        commitDraft,
      }),
    );

    act(() => {
      result.current.openMapEdit("tempo", 0, { bpm: 130 });
    });

    expect(result.current.tempoEditOpen).toBe(true);
    expect(result.current.tempoDraft).toBe("130");

    act(() => {
      result.current.openMapEdit("metrum", 0, { num: 3, den: 4 });
    });

    expect(result.current.meterEditOpen).toBe(true);
    expect(result.current.meterNumDraft).toBe("3");
    expect(result.current.meterDenDraft).toBe("4");
  });
});
