import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { TransportProvider } from "./transport/TransportProvider.js";
import { AdminShell } from "./shells/AdminShell.js";
import { DesktopMenuBridge } from "./shells/DesktopMenuBridge.js";
import { DeviceNameGate } from "./shells/DeviceNameGate.js";
import { RouteErrorPage } from "./shells/RouteErrorPage.js";
import { TimelineShell } from "./shells/TimelineShell.js";

/** Console SPA — Admin + Timeline (no Client role shells). */
const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    element: <DesktopMenuBridge />,
    children: [
      { path: "/", element: <Navigate to="/admin" replace /> },
      { path: "/admin", element: <AdminShell /> },
      { path: "/timeline/:projectId", element: <TimelineShell /> },
      { path: "/timeline", element: <Navigate to="/admin" replace /> },
      { path: "*", element: <Navigate to="/admin" replace /> },
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
