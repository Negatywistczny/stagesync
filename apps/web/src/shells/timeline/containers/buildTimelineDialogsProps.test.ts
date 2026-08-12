import { describe, it, expect, vi } from "vitest";
import { buildTimelineDialogsProps } from "./buildTimelineDialogsProps.js";

describe("buildTimelineDialogsProps", () => {
  it("builds dialogs props correctly from context", () => {
    const draft = {
      blocker: null,
      projectId: "p1",
      draftProject: { id: "p1" },
      savePending: false,
      setSavePending: vi.fn(),
      setSavedProject: vi.fn(),
      setDraftProject: vi.fn(),
      setDraftHistory: vi.fn(),
      setLoadError: vi.fn(),
    };
    const shortcuts = { onDiscard: vi.fn() };
    const modals = {
      helpOpen: false,
      setHelpOpen: vi.fn(),
      songScreenOpen: true,
      setSongScreenOpen: vi.fn(),
      songScreenId: "test-id",
      songImportOpen: false,
      importAsNewSong: false,
      importApplying: false,
      setSongImportOpen: vi.fn(),
    };
    const setlistState = { libraryNames: ["Song A", "Song B"] };
    const songImport = {
      activeImportEngine: null,
      smartTempoRunning: false,
      importProgress: 0,
      importStageLabel: "",
      importFile: null,
      importProject: null,
      importMeta: null,
      importError: null,
      applyImportToTimeline: vi.fn(),
      cancelImport: vi.fn(),
    };
    const floatingMenus = {};
    const audioState = {};
    const mapEdits = {
      tempoEditOpen: false,
      setTempoEditOpen: vi.fn(),
      tempoEditTitleId: "tempo-title",
      tempoDraft: "120",
      setTempoDraft: vi.fn(),
      meterEditOpen: false,
      setMeterEditOpen: vi.fn(),
      meterEditTitleId: "meter-title",
      meterNumDraft: "4",
      setMeterNumDraft: vi.fn(),
      meterDenDraft: "4",
      setMeterDenDraft: vi.fn(),
      keyEditOpen: false,
      setKeyEditOpen: vi.fn(),
      keyEditTitleId: "key-title",
      mapEditTicks: 0,
    };

    const props = buildTimelineDialogsProps({
      draft,
      shortcuts,
      modals,
      setlistState,
      songImport,
      floatingMenus,
      audioState,
      mapEdits,
      toolbarVisibleSet: new Set(["pointer"]),
      setToolbarVisibleTools: vi.fn(),
      displayTicks: 0,
      touchAlertOpen: false,
      setTouchAlertOpen: vi.fn(),
      tool: "pointer",
    });

    expect(props.projectId).toBe("p1");
    expect(props.songScreenOpen).toBe(true);
    expect(props.libraryNames).toEqual(["Song A", "Song B"]);
    expect(props.songScreenId).toBe("test-id");
  });
});
