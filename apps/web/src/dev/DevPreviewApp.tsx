import { useEffect } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TransportProvider } from "../transport/TransportProvider.js";
import { AdminShell } from "../shells/AdminShell.js";
import { ClientShell } from "../shells/ClientShell.js";
import { TimelineShell } from "../shells/TimelineShell.js";
import { DesktopMenuBridge } from "../shells/DesktopMenuBridge.js";
import { bootDevPreviewMocks } from "./applyDevSurfaceMocks.js";
import {
  getDevPreviewConfig,
  resolveDevPreviewPath,
} from "./devPreviewConfig.js";

function DevPreviewRoutes() {
  const config = getDevPreviewConfig();
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

export function DevPreviewApp() {
  useEffect(() => {
    bootDevPreviewMocks();
  }, []);

  return (
    <TransportProvider>
      <DesktopMenuBridge>
        <DevPreviewRoutes />
      </DesktopMenuBridge>
    </TransportProvider>
  );
}
