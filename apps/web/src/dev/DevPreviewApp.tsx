import { useEffect, useRef } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminShell } from "../shells/AdminShell.js";
import { ClientShell } from "../shells/ClientShell.js";
import { TimelineShell } from "../shells/TimelineShell.js";
import { applyDevSurfaceMocks } from "./applyDevSurfaceMocks.js";
import { devRoutePath, parseDevPreviewConfig } from "./devLayoutConfig.js";

function readPreviewConfig() {
  if (typeof window === "undefined") {
    return parseDevPreviewConfig("");
  }
  return parseDevPreviewConfig(window.location.search);
}

export function DevPreviewApp() {
  const config = readPreviewConfig();
  const appliedKeyRef = useRef<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const configKey = `${config.surface}:${config.route}:${config.session}`;

  if (appliedKeyRef.current !== configKey) {
    cleanupRef.current?.();
    cleanupRef.current = applyDevSurfaceMocks(config);
    appliedKeyRef.current = configKey;
  }

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
      appliedKeyRef.current = null;
    };
  }, []);

  const entryPath = devRoutePath(config.route);

  return (
    <MemoryRouter initialEntries={[entryPath]}>
      <Routes>
        <Route path="/admin" element={<AdminShell />} />
        <Route path="/client" element={<ClientShell />} />
        <Route path="/timeline/:projectId" element={<TimelineShell />} />
      </Routes>
    </MemoryRouter>
  );
}
