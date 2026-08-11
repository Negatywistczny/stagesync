/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import type {
  Project,
  UgImportOk,
  UgTabMetadata,
  UltrastarImportOk,
} from "@stagesync/shared";
import { TimelineSongDialogs } from "../dialogs/TimelineSongDialogs.js";
import { TimelinePortals } from "../menus/TimelinePortals.js";
import { TimelineMapDialogs } from "../dialogs/TimelineMapDialogs.js";
import type { ToolId } from "../timelineToolsData.js";
import type { TrackVisibilityMap } from "@lib/timeline/timelineTracks.js";

export type TimelineDialogsContainerProps = {
  blocker: any;
  projectId?: string;
  draftProject: Project | null;
  savePending: boolean;
  setSavePending: (v: boolean) => void;
  setSavedProject: (p: Project | null) => void;
  setDraftProject: (p: Project | null) => void;
  setDraftHistory: (h: any) => void;
  setLoadError: (err: string | null) => void;
  onDiscard: () => void;
  helpOpen: boolean;
  setHelpOpen: (v: boolean) => void;
  songScreenOpen: boolean;
  setSongScreenOpen: (v: boolean) => void;
  songScreenId: string;
  libraryNames: Array<{ id: string; name: string }>;
  songImportOpen: boolean;
  importAsNewSong: boolean;
  importApplying: boolean;
  importPreviewOptions: any;
  openSongImportWizard: (asNew: boolean) => void;
  closeImportModals: () => void;
  onImportUsUgBridge: (payload: any) => void;
  onImportUltrastar: (res: UltrastarImportOk) => void;
  onImportUg: (
    result: UgImportOk,
    runWand: boolean,
    metadata?: UgTabMetadata | null,
  ) => void;

  eyeOpen: boolean;
  eyeMenuPos: { left: number; top: number } | null;
  eyeMenuRef: React.RefObject<HTMLDivElement | null>;
  eyeMenuId: string;
  trackVisibility: TrackVisibilityMap;
  toggleTrack: (trackId: string) => void;
  toolsVisOpen: boolean;
  toolsVisMenuPos: { left: number; top: number } | null;
  toolsVisMenuRef: React.RefObject<HTMLDivElement | null>;
  toolsVisMenuId: string;
  toolbarVisibleSet: Set<string>;
  setToolbarVisibleTools: React.Dispatch<React.SetStateAction<any[]>>;
  toolMenu: { left: number; top: number } | null;
  toolMenuRef: React.RefObject<HTMLDivElement | null>;
  tool: ToolId;
  onTool: (tool: ToolId) => void;
  wandMenu: { left: number; top: number } | null;
  wandMenuRef: React.RefObject<HTMLDivElement | null>;
  applyWand: (preset: any) => void;

  displayTicks: number;
  mapEditTicks: number;
  commitDraft: (p: Project) => void;
  tempoEditOpen: boolean;
  setTempoEditOpen: (v: boolean) => void;
  tempoEditTitleId: string;
  tempoDraft: string;
  setTempoDraft: (v: string) => void;
  meterEditOpen: boolean;
  setMeterEditOpen: (v: boolean) => void;
  meterEditTitleId: string;
  meterNumDraft: string;
  setMeterNumDraft: (v: string) => void;
  meterDenDraft: string;
  setMeterDenDraft: (v: string) => void;
  keyEditOpen: boolean;
  setKeyEditOpen: (v: boolean) => void;
  keyEditTitleId: string;
  touchAlertOpen: boolean;
  setTouchAlertOpen: (v: boolean) => void;
};

export function TimelineDialogsContainer({
  blocker,
  projectId,
  draftProject,
  savePending,
  setSavePending,
  setSavedProject,
  setDraftProject,
  setDraftHistory,
  setLoadError,
  onDiscard,
  helpOpen,
  setHelpOpen,
  songScreenOpen,
  setSongScreenOpen,
  songScreenId,
  libraryNames,
  songImportOpen,
  importAsNewSong,
  importApplying,
  importPreviewOptions,
  openSongImportWizard,
  closeImportModals,
  onImportUsUgBridge,
  onImportUltrastar,
  onImportUg,

  eyeOpen,
  eyeMenuPos,
  eyeMenuRef,
  eyeMenuId,
  trackVisibility,
  toggleTrack,
  toolsVisOpen,
  toolsVisMenuPos,
  toolsVisMenuRef,
  toolsVisMenuId,
  toolbarVisibleSet,
  setToolbarVisibleTools,
  toolMenu,
  toolMenuRef,
  tool,
  onTool,
  wandMenu,
  wandMenuRef,
  applyWand,

  displayTicks,
  mapEditTicks,
  commitDraft,
  tempoEditOpen,
  setTempoEditOpen,
  tempoEditTitleId,
  tempoDraft,
  setTempoDraft,
  meterEditOpen,
  setMeterEditOpen,
  meterEditTitleId,
  meterNumDraft,
  setMeterNumDraft,
  meterDenDraft,
  setMeterDenDraft,
  keyEditOpen,
  setKeyEditOpen,
  keyEditTitleId,
  touchAlertOpen,
  setTouchAlertOpen,
}: TimelineDialogsContainerProps) {
  return (
    <>
      <TimelineSongDialogs
        blocker={blocker}
        projectId={projectId}
        draftProject={draftProject}
        savePending={savePending}
        setSavePending={setSavePending}
        setSavedProject={setSavedProject}
        setDraftProject={setDraftProject}
        setDraftHistory={setDraftHistory}
        setLoadError={setLoadError}
        onDiscard={onDiscard}
        helpOpen={helpOpen}
        setHelpOpen={setHelpOpen}
        songScreenOpen={songScreenOpen}
        setSongScreenOpen={setSongScreenOpen}
        songScreenId={songScreenId}
        libraryNames={libraryNames}
        songImportOpen={songImportOpen}
        importAsNewSong={importAsNewSong}
        importApplying={importApplying}
        importPreviewOptions={importPreviewOptions}
        openSongImportWizard={openSongImportWizard}
        closeImportModals={closeImportModals}
        onImportUsUgBridge={onImportUsUgBridge}
        onImportUltrastar={onImportUltrastar}
        onImportUg={onImportUg}
      />

      <TimelinePortals
        eyeOpen={eyeOpen}
        eyeMenuPos={eyeMenuPos}
        eyeMenuRef={eyeMenuRef}
        eyeMenuId={eyeMenuId}
        trackVisibility={trackVisibility}
        toggleTrack={toggleTrack}
        toolsVisOpen={toolsVisOpen}
        toolsVisMenuPos={toolsVisMenuPos}
        toolsVisMenuRef={toolsVisMenuRef}
        toolsVisMenuId={toolsVisMenuId}
        toolbarVisibleSet={toolbarVisibleSet}
        setToolbarVisibleTools={setToolbarVisibleTools}
        toolMenu={toolMenu}
        toolMenuRef={toolMenuRef}
        tool={tool}
        onTool={onTool}
        wandMenu={wandMenu}
        wandMenuRef={wandMenuRef}
        applyWand={applyWand}
      />

      <TimelineMapDialogs
        draftProject={draftProject}
        displayTicks={displayTicks}
        mapEditTicks={mapEditTicks}
        commitDraft={commitDraft}
        tempoEditOpen={tempoEditOpen}
        setTempoEditOpen={setTempoEditOpen}
        tempoEditTitleId={tempoEditTitleId}
        tempoDraft={tempoDraft}
        setTempoDraft={setTempoDraft}
        meterEditOpen={meterEditOpen}
        setMeterEditOpen={setMeterEditOpen}
        meterEditTitleId={meterEditTitleId}
        meterNumDraft={meterNumDraft}
        setMeterNumDraft={setMeterNumDraft}
        meterDenDraft={meterDenDraft}
        setMeterDenDraft={setMeterDenDraft}
        keyEditOpen={keyEditOpen}
        setKeyEditOpen={setKeyEditOpen}
        keyEditTitleId={keyEditTitleId}
        touchAlertOpen={touchAlertOpen}
        setTouchAlertOpen={setTouchAlertOpen}
      />
    </>
  );
}
