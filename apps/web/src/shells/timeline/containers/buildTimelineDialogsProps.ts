/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TimelineDialogsContainerProps } from "./TimelineDialogsContainer.js";

interface DialogsContext {
  draft: any;
  shortcuts: any;
  modals: any;
  setlistState: any;
  songImport: any;
  floatingMenus: any;
  audioState: any;
  mapEdits: any;
  toolbarVisibleSet: Set<string>;
  setToolbarVisibleTools: any;
  displayTicks: number;
  touchAlertOpen: boolean;
  setTouchAlertOpen: any;
  tool: any;
}

export function buildTimelineDialogsProps(
  ctx: DialogsContext,
): TimelineDialogsContainerProps {
  const {
    draft,
    shortcuts,
    modals,
    setlistState,
    songImport,
    floatingMenus,
    audioState,
    mapEdits,
    toolbarVisibleSet,
    setToolbarVisibleTools,
    displayTicks,
    touchAlertOpen,
    setTouchAlertOpen,
    tool,
  } = ctx;

  return {
    blocker: draft.blocker,
    projectId: draft.projectId,
    draftProject: draft.draftProject,
    savePending: draft.savePending,
    setSavePending: draft.setSavePending,
    setSavedProject: draft.setSavedProject,
    setDraftProject: draft.setDraftProject,
    setDraftHistory: draft.setDraftHistory,
    setLoadError: draft.setLoadError,
    onDiscard: shortcuts.onDiscard,
    helpOpen: modals.helpOpen,
    setHelpOpen: modals.setHelpOpen,
    songScreenOpen: modals.songScreenOpen,
    setSongScreenOpen: modals.setSongScreenOpen,
    songScreenId: modals.songScreenId ?? "tl-song-screen",
    libraryNames: setlistState.libraryNames ?? [],
    songImportOpen: modals.songImportOpen,
    importAsNewSong: modals.importAsNewSong,
    importApplying: modals.importApplying,
    importPreviewOptions: songImport.importPreviewOptions,
    openSongImportWizard: modals.openSongImportWizard,
    closeImportModals: modals.closeSongImportWizard ?? modals.closeImportModals,
    onImportUsUgBridge: songImport.onImportUsUgBridge,
    onImportUltrastar: songImport.onImportUltrastar,
    onImportUg: songImport.onImportUg,
    eyeOpen: floatingMenus.eyeOpen,
    eyeMenuPos: floatingMenus.eyeMenuPos,
    eyeMenuRef: floatingMenus.eyeMenuRef,
    eyeMenuId: floatingMenus.eyeMenuId ?? "tl-eye-menu",
    trackVisibility: audioState.trackVisibility ?? ctx.draft.trackVisibility,
    toggleTrack: audioState.toggleTrack,
    toolsVisOpen: floatingMenus.toolsVisOpen,
    toolsVisMenuPos: floatingMenus.toolsVisMenuPos,
    toolsVisMenuRef: floatingMenus.toolsVisMenuRef,
    toolsVisMenuId: floatingMenus.toolsVisMenuId ?? "tl-tools-vis",
    toolbarVisibleSet,
    setToolbarVisibleTools,
    toolMenu: floatingMenus.toolMenu,
    toolMenuRef: floatingMenus.toolMenuRef,
    tool,
    onTool: floatingMenus.onTool,
    wandMenu: floatingMenus.wandMenu,
    wandMenuRef: floatingMenus.wandMenuRef,
    applyWand: (mode: any) => shortcuts.applyWand?.(mode),
    displayTicks,
    mapEditTicks: mapEdits.mapEditTicks,
    commitDraft: draft.commitDraft,
    tempoEditOpen: mapEdits.tempoEditOpen,
    setTempoEditOpen: mapEdits.setTempoEditOpen,
    tempoEditTitleId: mapEdits.tempoEditTitleId ?? "tl-tempo-title",
    tempoDraft: mapEdits.tempoDraft,
    setTempoDraft: mapEdits.setTempoDraft,
    meterEditOpen: mapEdits.meterEditOpen,
    setMeterEditOpen: mapEdits.setMeterEditOpen,
    meterEditTitleId: mapEdits.meterEditTitleId ?? "tl-meter-title",
    meterNumDraft: mapEdits.meterNumDraft,
    setMeterNumDraft: mapEdits.setMeterNumDraft,
    meterDenDraft: mapEdits.meterDenDraft,
    setMeterDenDraft: mapEdits.setMeterDenDraft,
    keyEditOpen: mapEdits.keyEditOpen,
    setKeyEditOpen: mapEdits.setKeyEditOpen,
    keyEditTitleId: mapEdits.keyEditTitleId ?? "tl-key-title",
    touchAlertOpen,
    setTouchAlertOpen,
  };
}
