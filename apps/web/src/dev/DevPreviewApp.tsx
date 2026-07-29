import { useEffect, useMemo, useRef } from "react";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router-dom";
import { ContextMenuProvider } from "@stagesync/ui";
import { AdminShell } from "../shells/AdminShell.js";
import { ClientShell } from "../shells/ClientShell.js";
import { PreferencesEventBridge } from "../shells/PreferencesEventBridge.js";
import { TimelineShell } from "../shells/TimelineShell.js";
import { TransportProvider } from "../transport/TransportProvider.js";
import { applyDevSurfaceMocks } from "./applyDevSurfaceMocks.js";
import {
  getDevPreviewConfig,
  resolveDevPreviewPath,
} from "./devPreviewConfig.js";
import { installDevPreviewScreenshotListener } from "./devPreviewScreenshot.js";

function DevPreviewLayout() {
  return (
    <>
      <Outlet />
      <PreferencesEventBridge />
    </>
  );
}

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
    const removeScreenshotListener = installDevPreviewScreenshotListener();
    return () => {
      removeScreenshotListener();
      cleanupRef.current?.();
      cleanupRef.current = null;
      appliedKeyRef.current = null;
    };
  }, []);

  const entry = config ? resolveDevPreviewPath(config) : "/admin";
  const router = useMemo(
    () =>
      createMemoryRouter(
        [
          {
            element: <DevPreviewLayout />,
            children: [
              { path: "/admin", element: <AdminShell /> },
              { path: "/client", element: <ClientShell /> },
              { path: "/timeline/:projectId", element: <TimelineShell /> },
            ],
          },
        ],
        { initialEntries: [entry] },
      ),
    [entry],
  );

  return (
    <TransportProvider>
      <ContextMenuProvider>
        <RouterProvider router={router} />
      </ContextMenuProvider>
    </TransportProvider>
  );
}
