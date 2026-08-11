import { createBrowserRouter, Navigate } from "react-router";
import { RouterProvider } from "react-router/dom";
import { TransportProvider } from "./transport/TransportProvider.js";
import { AdminShell } from "./shells/admin/AdminShell.js";
import { ClientShell } from "./shells/client/ClientShell.js";
import { DesktopMenuBridge } from "./shells/desktop/DesktopMenuBridge.js";
import { DesktopRootRedirect } from "./shells/desktop/DesktopRootRedirect.js";
import { DeviceNameGate } from "./shells/components/DeviceNameGate.js";
import { RouteErrorPage } from "./shells/components/RouteErrorPage.js";
import { TimelineShell } from "./shells/timeline/TimelineShell.js";
import { SmartTempoPage } from "./shells/pages/SmartTempoPage.js";

/**
 * Console SPA — full desktop parity routes (Admin + Timeline + Client).
 * Performer stays Client-only via AppClient / dist-performer.
 */
const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    element: <DesktopMenuBridge />,
    children: [
      { path: "/", element: <DesktopRootRedirect /> },
      { path: "/client", element: <ClientShell /> },
      { path: "/admin", element: <AdminShell /> },
      { path: "/timeline/:projectId", element: <TimelineShell /> },
      { path: "/smart-tempo", element: <SmartTempoPage /> },
      { path: "/timeline", element: <Navigate to="/admin" replace /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function AppConsole() {
  return (
    <TransportProvider>
      <DeviceNameGate>
        <RouterProvider router={router} />
      </DeviceNameGate>
    </TransportProvider>
  );
}
