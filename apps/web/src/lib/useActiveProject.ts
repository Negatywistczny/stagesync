import { useCallback, useEffect, useRef, useState } from "react";
import type { Project } from "@stagesync/shared";
import { fetchProject } from "./libraryApi.js";

export function useActiveProject(activeProjectId: string | null | undefined) {
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const loadGenRef = useRef(0);

  const reload = useCallback(async () => {
    if (!activeProjectId) {
      setActiveProject(null);
      return;
    }
    const gen = ++loadGenRef.current;
    const id = activeProjectId;
    try {
      const project = await fetchProject(id);
      if (gen !== loadGenRef.current) return;
      setActiveProject(project);
    } catch {
      if (gen !== loadGenRef.current) return;
      setActiveProject(null);
    }
  }, [activeProjectId]);

  useEffect(() => {
    if (!activeProjectId) {
      loadGenRef.current += 1;
      setActiveProject(null);
      setLoading(false);
      return;
    }
    const gen = ++loadGenRef.current;
    setLoading(true);
    void (async () => {
      try {
        const project = await fetchProject(activeProjectId);
        if (gen !== loadGenRef.current) return;
        setActiveProject(project);
      } catch {
        if (gen !== loadGenRef.current) return;
        setActiveProject(null);
      } finally {
        if (gen === loadGenRef.current) setLoading(false);
      }
    })();
    return () => {
      loadGenRef.current += 1;
    };
  }, [activeProjectId]);

  return { activeProject, setActiveProject, loading, reload };
}
