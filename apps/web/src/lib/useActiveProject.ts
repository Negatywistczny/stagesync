import { useCallback, useEffect, useState } from "react";
import type { Project } from "@stagesync/shared";
import { fetchProject } from "./libraryApi.js";

const REFRESH_MS = 20_000;

export function useActiveProject(activeProjectId: string | null | undefined) {
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!activeProjectId) {
      setActiveProject(null);
      return;
    }
    const project = await fetchProject(activeProjectId);
    setActiveProject(project);
  }, [activeProjectId]);

  useEffect(() => {
    if (!activeProjectId) {
      setActiveProject(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    async function load(quiet: boolean) {
      try {
        const project = await fetchProject(activeProjectId!);
        if (!cancelled) setActiveProject(project);
      } catch {
        if (!cancelled && !quiet) setActiveProject(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load(false);

    function onFocus() {
      void load(true);
    }
    function onVisibility() {
      if (document.visibilityState === "visible") void load(true);
    }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    const poll = window.setInterval(() => void load(true), REFRESH_MS);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(poll);
    };
  }, [activeProjectId]);

  return { activeProject, setActiveProject, loading, reload };
}
