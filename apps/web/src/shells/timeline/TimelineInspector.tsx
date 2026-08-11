import React from "react";
import type {
  Project,
  FormaClip,
  TekstClip,
  AkordClip,
  CueClip,
  ScoreBarAnchor,
  AudioClip,
  AudioTrack,
} from "@stagesync/shared";
import type { MapLaneId } from "@lib/timeline/mapLaneEdit.js";
import type { ClipSelectionLane } from "@lib/timeline/timelineSelection.js";
import { IconClose } from "../icons.js";
import { ShellIconButton } from "../ShellIconButton.js";
import styles from "../TimelineShell.module.css";
import { SongMetaInspector } from "./inspector/SongMetaInspector.js";
import { MapLaneInspector } from "./inspector/MapLaneInspector.js";
import { TekstClipInspector } from "./inspector/TekstClipInspector.js";
import { AkordClipInspector } from "./inspector/AkordClipInspector.js";
import { CueClipInspector } from "./inspector/CueClipInspector.js";
import { ScoreAnchorInspector } from "./inspector/ScoreAnchorInspector.js";
import { AudioClipInspector } from "./inspector/AudioClipInspector.js";
import { AudioTrackInspector } from "./inspector/AudioTrackInspector.js";
import { FormaClipInspector } from "./inspector/FormaClipInspector.js";

interface TimelineInspectorProps {
  inspectorOpen: boolean;
  closeInspectorPanel: () => void;
  clipSelectionItemsLength: number;
  selectionLane: ClipSelectionLane | null;
  songMetaOpen: boolean;
  draftProject: Project | null;
  commitDraft: (next: Project) => void;
  openSongImportWizard: (asNew: boolean) => void;
  selectedMapLane: MapLaneId | null;
  selectedMapIds: string[];
  primaryMapId: string | null;
  selectedTekstClip: TekstClip | null;
  selectedAkordClip: AkordClip | null;
  selectedCueClip: CueClip | null;
  selectedAnchor: ScoreBarAnchor | null;
  selectedAudioClip: AudioClip | null;
  selectedDockAudioTrack: AudioTrack | null;
  selectedClip: FormaClip | null;
  selectedSubsectionRows: { index: number; startDisplayBar: number }[];
  selectedSubsectionIdx: number | null;
  setSelectedSubsectionIdx: (idx: number | null) => void;
  onClipRename: (name: string) => void;
  onCountdownBarsChange: (raw: string) => void;
  audioUploadPending: boolean;
  onUploadAudioToTrack: (trackId: string, file: File) => Promise<void>;
  displayTicks: number;
  projectId: string | null;
}

export function TimelineInspector({
  inspectorOpen,
  closeInspectorPanel,
  clipSelectionItemsLength,
  selectionLane,
  songMetaOpen,
  draftProject,
  commitDraft,
  openSongImportWizard,
  selectedMapLane,
  selectedMapIds,
  primaryMapId,
  selectedTekstClip,
  selectedAkordClip,
  selectedCueClip,
  selectedAnchor,
  selectedAudioClip,
  selectedDockAudioTrack,
  selectedClip,
  selectedSubsectionRows,
  selectedSubsectionIdx,
  setSelectedSubsectionIdx,
  onClipRename,
  onCountdownBarsChange,
  audioUploadPending,
  onUploadAudioToTrack,
  displayTicks,
  projectId,
}: TimelineInspectorProps) {
  return (
    <aside
      className={[styles.inspector, inspectorOpen ? styles.inspectorOpen : ""]
        .filter(Boolean)
        .join(" ")}
      aria-label="Właściwości"
      aria-hidden={!inspectorOpen ? true : undefined}
    >
      <div className={styles.inspHead}>
        <h2 className={styles.inspTitle}>Właściwości</h2>
        <span className={styles.inspClose}>
          <ShellIconButton
            label="Zamknij właściwości"
            onClick={closeInspectorPanel}
          >
            <IconClose />
          </ShellIconButton>
        </span>
      </div>
      {clipSelectionItemsLength > 1 ? (
        <p className={styles.inspMulti} role="status" aria-live="polite">
          Zaznaczono {clipSelectionItemsLength} klipów
          {selectionLane
            ? ` · ${
                selectionLane === "forma"
                  ? "Forma"
                  : selectionLane === "tekst"
                    ? "Tekst"
                    : selectionLane === "akordy"
                      ? "Akordy"
                      : selectionLane === "cue"
                        ? "Cue"
                        : "Audio"
              }`
            : ""}
        </p>
      ) : null}
      {songMetaOpen && draftProject ? (
        <SongMetaInspector
          draftProject={draftProject}
          commitDraft={commitDraft}
          openSongImportWizard={openSongImportWizard}
        />
      ) : selectedMapLane && selectedMapIds.length > 0 ? (
        <MapLaneInspector
          selectedMapLane={selectedMapLane}
          selectedMapIds={selectedMapIds}
          primaryMapId={primaryMapId}
        />
      ) : selectedTekstClip ? (
        <TekstClipInspector
          draftProject={draftProject}
          commitDraft={commitDraft}
          selectedTekstClip={selectedTekstClip}
        />
      ) : selectedAkordClip ? (
        <AkordClipInspector
          draftProject={draftProject}
          commitDraft={commitDraft}
          selectedAkordClip={selectedAkordClip}
        />
      ) : selectedCueClip ? (
        <CueClipInspector
          draftProject={draftProject}
          commitDraft={commitDraft}
          selectedCueClip={selectedCueClip}
          displayTicks={displayTicks}
          projectId={projectId}
        />
      ) : selectedAnchor ? (
        <ScoreAnchorInspector
          draftProject={draftProject}
          commitDraft={commitDraft}
          selectedAnchor={selectedAnchor}
        />
      ) : selectedAudioClip ? (
        <AudioClipInspector
          draftProject={draftProject}
          commitDraft={commitDraft}
          selectedAudioClip={selectedAudioClip}
        />
      ) : selectedDockAudioTrack ? (
        <AudioTrackInspector
          draftProject={draftProject}
          commitDraft={commitDraft}
          selectedDockAudioTrack={selectedDockAudioTrack}
          audioUploadPending={audioUploadPending}
          onUploadAudioToTrack={onUploadAudioToTrack}
        />
      ) : selectedClip ? (
        <FormaClipInspector
          draftProject={draftProject}
          commitDraft={commitDraft}
          selectedClip={selectedClip}
          selectedSubsectionRows={selectedSubsectionRows}
          selectedSubsectionIdx={selectedSubsectionIdx}
          setSelectedSubsectionIdx={setSelectedSubsectionIdx}
          onClipRename={onClipRename}
          onCountdownBarsChange={onCountdownBarsChange}
        />
      ) : (
        <p className={styles.inspBody}>
          Zaznacz clip Forma / Tekst / Akordy / Cue / Kotwice lub event mapy
          (Tempo / Metrum / Tonacja).
        </p>
      )}
    </aside>
  );
}
