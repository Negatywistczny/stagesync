import { useEffect, useState } from "react";
import { fetchLibrary } from "@lib/shell-operator/libraryApi.js";
import { fetchSetlist } from "@lib/shell-operator/setlistApi.js";
import { pushRecentTimelineProject } from "@lib/client/lastTimelineProject.js";
import {
  syncNavRecentProjects,
  syncNavTimelineProjectId,
} from "@lib/client/desktopBridge.js";

export type UseTimelineSetlistStateOpts = {
  projectId: string | null | undefined;
  draftProjectName?: string;
  songScreenOpen: boolean;
  setlistSnapshot: {
    projectIds: string[];
    enabled: boolean;
    autoAdvanceEnabled: boolean;
  };
  reloadProject: (id: string) => Promise<void>;
};

export function useTimelineSetlistState({
  projectId,
  draftProjectName,
  songScreenOpen,
  setlistSnapshot,
  reloadProject,
}: UseTimelineSetlistStateOpts) {
  const [libraryNames, setLibraryNames] = useState<
    { id: string; name: string }[]
  >([]);
  const [setlistIds, setSetlistIds] = useState<string[]>([]);
  const [setlistEnabled, setSetlistEnabled] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    void reloadProject(projectId);
  }, [projectId, reloadProject]);

  useEffect(() => {
    if (!projectId) return;
    const name = draftProjectName ?? projectId;
    const recent = pushRecentTimelineProject(projectId, name);
    void syncNavTimelineProjectId(projectId);
    void syncNavRecentProjects(recent);
  }, [projectId, draftProjectName]);

  useEffect(() => {
    if (!songScreenOpen) return;
    void (async () => {
      try {
        const lib = await fetchLibrary();
        setLibraryNames(lib.projects.map((p) => ({ id: p.id, name: p.name })));
      } catch {
        setLibraryNames([]);
      }
    })();
  }, [songScreenOpen]);

  useEffect(() => {
    setSetlistIds(setlistSnapshot.projectIds);
    setSetlistEnabled(setlistSnapshot.enabled);
    setAutoAdvance(setlistSnapshot.autoAdvanceEnabled);
  }, [setlistSnapshot]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const view = await fetchSetlist();
        if (cancelled) return;
        setSetlistIds(view.projectIds);
        setSetlistEnabled(view.enabled);
        setAutoAdvance(view.autoAdvance.enabled);
      } catch {
        if (!cancelled) {
          setSetlistIds([]);
          setSetlistEnabled(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const setlistIndex = projectId ? setlistIds.indexOf(projectId) : -1;
  const prevSetlistId =
    setlistEnabled && setlistIndex > 0 ? setlistIds[setlistIndex - 1] : null;
  const nextSetlistId =
    setlistEnabled && setlistIndex >= 0 && setlistIndex < setlistIds.length - 1
      ? setlistIds[setlistIndex + 1]
      : null;

  return {
    libraryNames,
    setlistEnabled,
    setSetlistEnabled,
    autoAdvance,
    setAutoAdvance,
    prevSetlistId,
    nextSetlistId,
  };
}
