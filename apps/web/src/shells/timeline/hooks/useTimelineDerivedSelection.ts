import type { Project } from "@stagesync/shared";
import { resolveMeterAt, resolveTempoAt } from "@stagesync/shared";
import {
  primaryAudioTrackId,
  primaryLane,
  type TrackSelection,
} from "@lib/timeline/timelineSelection.js";
import { isAudioSelectionLane } from "@lib/timeline/timelineSelection.js";
import { formaSubsectionRows } from "@lib/timeline-edit/formaInspector.js";
import { scoreAnchors } from "@lib/timeline-edit/scoreBarEdit.js";

export type UseTimelineDerivedSelectionOpts = {
  draftProject: Project | null;
  clipSelection: any;
  trackSelection: TrackSelection;
  selectedAnchorId: string | null;
  isMobilePreview: boolean;
  inspectorVisible: boolean;
  timelineSurface: string;
  displayTicks: number;
  state: {
    timeSignature: any;
    bpm: number;
  };
};

export function useTimelineDerivedSelection({
  draftProject,
  clipSelection,
  trackSelection,
  selectedAnchorId,
  isMobilePreview,
  inspectorVisible,
  timelineSurface,
  displayTicks,
  state,
}: UseTimelineDerivedSelectionOpts) {
  const primaryId = clipSelection.primaryId;
  const selectionLane = primaryLane(clipSelection);

  const selectedClipId = selectionLane === "forma" ? primaryId : null;
  const selectedTekstClipId = selectionLane === "tekst" ? primaryId : null;
  const selectedAkordClipId = selectionLane === "akordy" ? primaryId : null;
  const selectedCueClipId = selectionLane === "cue" ? primaryId : null;
  const selectedAudioClipId = isAudioSelectionLane(selectionLane)
    ? primaryId
    : null;

  const selectedClip =
    draftProject?.forma.clips.find((c) => c.id === selectedClipId) ?? null;
  const selectedSubsectionRows =
    draftProject && selectedClip?.kind === "section"
      ? formaSubsectionRows(draftProject, selectedClip)
      : [];
  const selectedTekstClip =
    draftProject?.tekst.clips.find((c) => c.id === selectedTekstClipId) ?? null;
  const selectedAkordClip =
    draftProject?.akordy.clips.find((c) => c.id === selectedAkordClipId) ??
    null;
  const selectedCueClip =
    draftProject?.cue.clips.find((c) => c.id === selectedCueClipId) ?? null;
  const selectedAudioClip =
    draftProject && selectedAudioClipId
      ? (draftProject.audioClips.find((c) => c.id === selectedAudioClipId) ??
        null)
      : null;
  const selectedDockAudioTrack =
    draftProject && primaryAudioTrackId(trackSelection)
      ? (draftProject.audioTracks.find(
          (tr) => tr.id === primaryAudioTrackId(trackSelection),
        ) ?? null)
      : null;
  const selectedAnchor =
    draftProject && selectedAnchorId
      ? (scoreAnchors(draftProject).find((a) => a.id === selectedAnchorId) ??
        null)
      : null;

  const inspectorOpen =
    !isMobilePreview && inspectorVisible && timelineSurface !== "mixer";

  const meterAtPlayhead = draftProject
    ? resolveMeterAt(draftProject, displayTicks)
    : state.timeSignature;
  const tempoAtPlayhead = draftProject
    ? resolveTempoAt(draftProject, displayTicks)
    : state.bpm;

  return {
    primaryId,
    selectionLane,
    selectedClipId,
    selectedTekstClipId,
    selectedAkordClipId,
    selectedCueClipId,
    selectedAudioClipId,
    selectedClip,
    selectedSubsectionRows,
    selectedTekstClip,
    selectedAkordClip,
    selectedCueClip,
    selectedAudioClip,
    selectedDockAudioTrack,
    selectedAnchor,
    inspectorOpen,
    meterAtPlayhead,
    tempoAtPlayhead,
  };
}
