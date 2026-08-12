// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { useTimelineSongImport } from "./useTimelineSongImport.js";
import type { Project, UgImportOk, UltrastarImportOk } from "@stagesync/shared";

vi.mock("@stagesync/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stagesync/shared")>();
  return {
    ...actual,
    applyUgImportToProject: (p: Project) => ({ ...p, name: "Imported UG" }),
    applyUltrastarImportToProject: (p: Project) => ({
      ...p,
      name: "Imported US",
    }),
    applyUsUgBridgeToProject: (p: Project) => ({
      ...p,
      name: "Imported US+UG",
    }),
    placeContentFromForma: (p: Project) => ({ ok: true, project: p }),
  };
});

vi.mock("@lib/shell-operator/libraryApi.js", () => ({
  putProject: vi.fn().mockImplementation((id, p) => Promise.resolve(p)),
}));

describe("useTimelineSongImport", () => {
  const dummyProject: Project = {
    id: "p1",
    name: "Original Song",
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
    scoreBarMap: { anchors: [] },
    audioTracks: [],
    audioClips: [],
    assets: [],
  };

  it("handles UG import into active draft project", async () => {
    const draftRef = { current: dummyProject };
    const commitDraft = vi.fn();
    const setImportApplying = vi.fn();
    const closeImportModals = vi.fn();
    const setSongScreenOpen = vi.fn();
    const setSongMetaOpen = vi.fn();
    const flashCanvasNotice = vi.fn();

    const { result } = renderHook(
      () =>
        useTimelineSongImport({
          projectId: "p1",
          draftProject: dummyProject,
          draftRef,
          commitDraft,
          importAsNewSong: false,
          setImportApplying,
          closeImportModals,
          setSongScreenOpen,
          setSongMetaOpen,
          flashCanvasNotice,
        }),
      {
        wrapper: MemoryRouter,
      },
    );

    const ugResult: UgImportOk = {
      ok: true,
      tekst: { clips: [] },
      akordy: { clips: [] },
      formaMusic: { clips: [] },
      sections: [],
      barsPerLine: 1,
    };

    await act(async () => {
      await result.current.onImportUg(ugResult, false);
    });

    expect(commitDraft).toHaveBeenCalled();
    expect(flashCanvasNotice).toHaveBeenCalled();
    expect(closeImportModals).toHaveBeenCalled();
  });

  it("handles Ultrastar import into active draft project", async () => {
    const draftRef = { current: dummyProject };
    const commitDraft = vi.fn();
    const setImportApplying = vi.fn();
    const closeImportModals = vi.fn();
    const setSongScreenOpen = vi.fn();
    const setSongMetaOpen = vi.fn();
    const flashCanvasNotice = vi.fn();

    const { result } = renderHook(
      () =>
        useTimelineSongImport({
          projectId: "p1",
          draftProject: dummyProject,
          draftRef,
          commitDraft,
          importAsNewSong: false,
          setImportApplying,
          closeImportModals,
          setSongScreenOpen,
          setSongMetaOpen,
          flashCanvasNotice,
        }),
      {
        wrapper: MemoryRouter,
      },
    );

    const usResult = {
      bpm: 120,
      title: "US Title",
      artist: "US Artist",
      notes: [],
      lines: [],
      syllableCount: 10,
      tekst: { clips: [] },
    } as unknown as UltrastarImportOk;

    await act(async () => {
      await result.current.onImportUltrastar(usResult);
    });

    expect(commitDraft).toHaveBeenCalled();
    expect(flashCanvasNotice).toHaveBeenCalled();
    expect(closeImportModals).toHaveBeenCalled();
  });
});
