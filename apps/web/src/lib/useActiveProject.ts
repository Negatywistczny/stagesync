import { useEffect, useState } from "react";
import type { Project } from "@stagesync/shared";
import { fetchProject } from "./libraryApi.js";

export function useActiveProject(activeProjectId: string | null | undefined) {
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeProjectId) {
      setActiveProject(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const project = await fetchProject(activeProjectId);
        if (!cancelled) setActiveProject(project);
      } catch {
        if (!cancelled) setActiveProject(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeProjectId]);

  return { activeProject, loading };
}
