// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAdminImportHandlers } from "./useAdminImportHandlers.js";

const mockNavigate = vi.fn();
vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@lib/shell-operator/libraryApi.js", () => ({
  fetchProject: vi.fn().mockResolvedValue({
    id: "proj-1",
    name: "Existing Song",
    ppq: 960,
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
  }),
  putProject: vi.fn().mockImplementation(async (id, p) => p),
}));

vi.mock("@lib/client/desktopFileMenu.js", () => ({
  createSongWithContent: vi.fn().mockImplementation(async (name, transform) => {
    const base = {
      id: "new-song-id",
      name,
      ppq: 960,
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
    return transform(base);
  }),
}));

vi.mock("@stagesync/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stagesync/shared")>();
  return {
    ...actual,
    importUgText: vi.fn().mockReturnValue({ ok: true, song: { sections: [] } }),
    reflowUgImportSectionBars: vi
      .fn()
      .mockReturnValue({ ok: true, sections: [] }),
    applyUgImportToProject: vi.fn().mockImplementation((p) => p),
    applyUltrastarImportToProject: vi.fn().mockImplementation((p) => p),
    applyUsUgBridgeToProject: vi.fn().mockImplementation((p) => p),
  };
});

describe("useAdminImportHandlers", () => {
  it("applies UG import to existing selected project", async () => {
    const setCommandPending = vi.fn();
    const setImportModalOpen = vi.fn();
    const setActionNotice = vi.fn();
    const refreshLibrary = vi.fn().mockResolvedValue({});

    const { result } = renderHook(() =>
      useAdminImportHandlers({
        selectedId: "proj-1",
        setCommandPending,
        setImportModalOpen,
        setActionNotice,
        refreshLibrary,
      }),
    );

    await act(async () => {
      await result.current.onApplyUg({
        text: "[Verse]\nC G",
        barsPerLine: 4,
        sectionBars: {},
        runWand: false,
        metadata: { title: "Updated Title" },
      });
    });

    expect(setImportModalOpen).toHaveBeenCalledWith(false);
    expect(setActionNotice).toHaveBeenCalledWith(
      expect.stringContaining("Import UG:"),
    );
    expect(refreshLibrary).toHaveBeenCalledWith("proj-1");
  });

  it("applies US+UG bridge as a new song and navigates", async () => {
    const setCommandPending = vi.fn();
    const setImportModalOpen = vi.fn();
    const setActionNotice = vi.fn();
    const refreshLibrary = vi.fn().mockResolvedValue({});

    const { result } = renderHook(() =>
      useAdminImportHandlers({
        selectedId: null,
        setCommandPending,
        setImportModalOpen,
        setActionNotice,
        refreshLibrary,
      }),
    );

    await act(async () => {
      await result.current.onApplyUsUg({
        bridge: {
          ok: true,
          title: "New Bridge Song",
          ugDoc: { metadata: {} },
        } as any,
      });
    });

    expect(setImportModalOpen).toHaveBeenCalledWith(false);
    expect(refreshLibrary).toHaveBeenCalledWith("new-song-id");
    expect(mockNavigate).toHaveBeenCalledWith("/timeline/new-song-id");
  });
});
