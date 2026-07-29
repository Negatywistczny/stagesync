import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { TransportProvider } from "./transport/TransportProvider.js";
import { AdminShell } from "./shells/AdminShell.js";
import { ClientShell } from "./shells/ClientShell.js";
import { DesktopMenuBridge } from "./shells/DesktopMenuBridge.js";
import { DesktopRootRedirect } from "./shells/DesktopRootRedirect.js";
import { DeviceNameGate } from "./shells/DeviceNameGate.js";
import { OperatorPinGate } from "./shells/OperatorPinGate.js";
import { RouteErrorPage } from "./shells/RouteErrorPage.js";
import { TimelineShell } from "./shells/TimelineShell.js";
import { buildDevRoutes, isDevOnlyPath } from "./dev/devRoutes.js";

const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    element: <DesktopMenuBridge />,
    children: [
      ...buildDevRoutes(import.meta.env.DEV),
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
      { path: "/timeline", element: <Navigate to="/admin" replace /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  const bypassDeviceNameGate =
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    isDevOnlyPath(window.location.pathname);

  return (
    <TransportProvider>
      {bypassDeviceNameGate ? (
        <RouterProvider router={router} />
      ) : (
        <DeviceNameGate>
          <RouterProvider router={router} />
        </DeviceNameGate>
      )}
    </TransportProvider>
  );
}
