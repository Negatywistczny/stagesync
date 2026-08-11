import { createBrowserRouter, Navigate } from "react-router";
import { RouterProvider } from "react-router/dom";
import { TransportProvider } from "./transport/TransportProvider.js";
import { AdminShell } from "./shells/admin/AdminShell.js";
import { ClientShell } from "./shells/client/ClientShell.js";
import { DesktopMenuBridge } from "./shells/desktop/DesktopMenuBridge.js";
import { DesktopRootRedirect } from "./shells/desktop/DesktopRootRedirect.js";
import { DeviceNameGate } from "./shells/components/DeviceNameGate.js";
import { MemoryPressureBanner } from "./shells/components/MemoryPressureBanner.js";
import { OperatorPinGate } from "./shells/components/OperatorPinGate.js";
import { RouteErrorPage } from "./shells/components/RouteErrorPage.js";
import { TimelineShell } from "./shells/timeline/TimelineShell.js";
import { SmartTempoPage } from "./shells/pages/SmartTempoPage.js";
import { DevApp } from "./dev/DevApp.js";
import { DevPreviewApp } from "./dev/DevPreviewApp.js";
import { isDevPreviewRoute } from "./dev/devPreviewConfig.js";
import { isDevPreviewPath } from "./dev/devRoutes.js";

const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    element: <DesktopMenuBridge />,
    children: [
      { path: "/", element: <DesktopRootRedirect /> },
      { path: "/client", element: <ClientShell /> },
      {
        path: "/admin",
        element: (
          <OperatorPinGate>
            <AdminShell />
          </OperatorPinGate>
        ),
      },
      {
        path: "/timeline/:projectId",
        element: (
          <OperatorPinGate>
            <TimelineShell />
          </OperatorPinGate>
        ),
      },
      { path: "/smart-tempo", element: <SmartTempoPage /> },
      { path: "/timeline", element: <Navigate to="/admin" replace /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "";

  if (import.meta.env.DEV && isDevPreviewPath(pathname)) {
    return <DevPreviewApp />;
  }

  if (import.meta.env.DEV && isDevPreviewRoute(pathname)) {
    return <DevApp />;
  }

  return (
    <TransportProvider>
      <MemoryPressureBanner />
      <DeviceNameGate>
        <RouterProvider router={router} />
      </DeviceNameGate>
    </TransportProvider>
  );
}
