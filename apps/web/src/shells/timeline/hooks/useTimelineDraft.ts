import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useBlocker } from "react-router";
import type { AudioTrack, Project } from "@stagesync/shared";
import { syncEditHistoryState } from "@lib/client/desktopBridge.js";
import { fetchProject, putProject } from "@lib/shell-operator/libraryApi.js";
import { projectContentEqual } from "@lib/timeline-edit/formaCanvas.js";
import {
  canRedo,
  canUndo,
  createDraftHistory,
  pushDraftHistory,
  redoDraft,
  syncPresentAfterSave,
  undoDraft,
  type DraftHistory,
} from "@lib/client/draftHistory.js";
import type { ClipSelection } from "@lib/timeline/timelineSelection.js";

export type UseTimelineDraftParams = {
  projectId: string | null | undefined;
  clipSelectionRef: RefObject<ClipSelection>;
  onEnsureAudioTracks?: (tracks: AudioTrack[]) => void;
  onProjectLoaded?: (project: Project) => Promise<void> | void;
  onRestoreClipSelection?: (selection: ClipSelection) => void;
};

export function useTimelineDraft({
  projectId,
  clipSelectionRef,
  onEnsureAudioTracks,
  onProjectLoaded,
  onRestoreClipSelection,
}: UseTimelineDraftParams) {
  const [savedProject, setSavedProject] = useState<Project | null>(null);
  const [draftProject, setDraftProject] = useState<Project | null>(null);
  const [draftHistory, setDraftHistory] = useState<DraftHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [savePending, setSavePending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const draftRef = useRef<Project | null>(null);
  draftRef.current = draftProject;

  const reloadProject = useCallback(
    async (id: string) => {
      setLoading(true);
      setLoadError(null);
      try {
        const project = await fetchProject(id);
        if (onProjectLoaded) {
          await onProjectLoaded(project);
        }
        setSavedProject(project);
        setDraftProject(project);
        setDraftHistory(createDraftHistory(project));
        onEnsureAudioTracks?.(project.audioTracks ?? []);
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : "Nie udało się wczytać",
        );
        setSavedProject(null);
        setDraftProject(null);
        setDraftHistory(null);
      } finally {
        setLoading(false);
      }
    },
    [onEnsureAudioTracks, onProjectLoaded],
  );

  const commitDraft = useCallback(
    (next: Project) => {
      const sel = clipSelectionRef.current;
      setDraftProject(next);
      onEnsureAudioTracks?.(next.audioTracks ?? []);
      setDraftHistory((h) =>
        h ? pushDraftHistory(h, next, sel) : createDraftHistory(next, sel),
      );
    },
    [clipSelectionRef, onEnsureAudioTracks],
  );

  const onSave = useCallback(async () => {
    if (!projectId || !draftProject) return;
    setSavePending(true);
    try {
      const next = await putProject(projectId, draftProject);
      setSavedProject(next);
      setDraftProject(next);
      setDraftHistory((h) =>
        h ? syncPresentAfterSave(h, next) : createDraftHistory(next),
      );
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Zapis nie powiódł się",
      );
    } finally {
      setSavePending(false);
    }
  }, [projectId, draftProject]);

  const onUndo = useCallback(() => {
    setDraftHistory((h) => {
      if (!h || !canUndo(h)) return h;
      const next = undoDraft(h);
      setDraftProject(next.present.project);
      onRestoreClipSelection?.(next.present.clipSelection);
      return next;
    });
  }, [onRestoreClipSelection]);

  const onRedo = useCallback(() => {
    setDraftHistory((h) => {
      if (!h || !canRedo(h)) return h;
      const next = redoDraft(h);
      setDraftProject(next.present.project);
      onRestoreClipSelection?.(next.present.clipSelection);
      return next;
    });
  }, [onRestoreClipSelection]);

  const dirty =
    savedProject !== null &&
    draftProject !== null &&
    !projectContentEqual(savedProject, draftProject);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    void syncEditHistoryState(
      draftHistory ? canUndo(draftHistory) : false,
      draftHistory ? canRedo(draftHistory) : false,
    );
  }, [draftHistory]);

  return {
    savedProject,
    setSavedProject,
    draftProject,
    setDraftProject,
    draftHistory,
    setDraftHistory,
    loading,
    setLoading,
    savePending,
    setSavePending,
    loadError,
    setLoadError,
    draftRef,
    dirty,
    blocker,
    reloadProject,
    commitDraft,
    onSave,
    onUndo,
    onRedo,
  };
}
