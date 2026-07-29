import { useEffect, useRef } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminShell } from "../shells/AdminShell.js";
import { ClientShell } from "../shells/ClientShell.js";
import { TimelineShell } from "../shells/TimelineShell.js";
import { applyDevSurfaceMocks } from "./applyDevSurfaceMocks.js";
import {
  getDevPreviewConfig,
  resolveDevPreviewPath,
} from "./devPreviewConfig.js";

export function DevPreviewApp() {
  const config = getDevPreviewConfig();
  const appliedKeyRef = useRef<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const configKey = config
    ? `${config.surface}:${config.path}:${config.session}:${config.projectId}`
    : null;

  if (config && appliedKeyRef.current !== configKey) {
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

  const entry = config ? resolveDevPreviewPath(config) : "/admin";

  return (
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/admin" element={<AdminShell />} />
        <Route path="/client" element={<ClientShell />} />
        <Route path="/timeline/:projectId" element={<TimelineShell />} />
      </Routes>
    </MemoryRouter>
  );
}
