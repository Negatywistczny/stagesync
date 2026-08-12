// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimelineWandTool } from "./useTimelineWandTool.js";
import type { Project } from "@stagesync/shared";

vi.mock("@stagesync/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stagesync/shared")>();
  return {
    ...actual,
    placeContentFromForma: vi.fn().mockReturnValue({
      ok: true,
      placed: 3,
      message: "Rozmieszczono 3 klipy",
      project: { id: "p1" },
    }),
  };
});

describe("useTimelineWandTool", () => {
  const dummyProject: Project = {
    id: "p1",
    name: "Song",
    formatVersion: 6,
    updatedAt: new Date().toISOString(),
    ppq: 960,
    defaultBpm: 120,
    defaultMeter: { numerator: 4, denominator: 4 },
    forma: {
      clips: [
        {
          id: "sec-1",
          name: "Zwrotka",
          kind: "section",
          startTicks: 0,
          lengthTicks: 3840,
        },
      ],
    },
    tempoMap: [],
    meterMap: [],
    keyMap: [],
    akordy: { clips: [] },
    tekst: { clips: [] },
    melody: { clips: [] },
    cue: { clips: [] },
    scoreBarMap: { anchors: [] },
    audioTracks: [],
    audioClips: [],
    assets: [],
  };

  it("applies wand and commits transformed draft", () => {
    const draftRef = { current: dummyProject };
    const commitDraft = vi.fn();
    const flashCanvasNotice = vi.fn();
    const setWandMenu = vi.fn();
    const setTool = vi.fn();

    const { result } = renderHook(() =>
      useTimelineWandTool({
        draftRef,
        clipSelection: { items: [{ lane: "forma", id: "sec-1" }] as any },
        commitDraft,
        flashCanvasNotice,
        setWandMenu,
        setTool,
      }),
    );

    act(() => {
      result.current.applyWand("both");
    });

    expect(commitDraft).toHaveBeenCalled();
    expect(flashCanvasNotice).toHaveBeenCalledWith("Rozmieszczono 3 klipy");
    expect(setWandMenu).toHaveBeenCalledWith(null);
    expect(setTool).toHaveBeenCalledWith("pointer");
  });

  it("flashes notice and aborts when selection contains only cue", () => {
    const draftRef = { current: dummyProject };
    const commitDraft = vi.fn();
    const flashCanvasNotice = vi.fn();
    const setWandMenu = vi.fn();
    const setTool = vi.fn();

    const { result } = renderHook(() =>
      useTimelineWandTool({
        draftRef,
        clipSelection: { items: [{ lane: "cue", id: "cue-1" }] as any },
        commitDraft,
        flashCanvasNotice,
        setWandMenu,
        setTool,
      }),
    );

    act(() => {
      result.current.applyWand("both");
    });

    expect(commitDraft).not.toHaveBeenCalled();
    expect(flashCanvasNotice).toHaveBeenCalledWith(
      expect.stringContaining("Różdżka nie działa na Cue"),
    );
  });
});
