import { createBrowserRouter, Navigate } from "react-router";
import { RouterProvider } from "react-router/dom";
import { TransportProvider } from "./transport/TransportProvider.js";
import { ClientShell } from "./shells/client/ClientShell.js";
import { DeviceNameGate } from "./shells/components/DeviceNameGate.js";
import { MemoryPressureBanner } from "./shells/components/MemoryPressureBanner.js";
import { RouteErrorPage } from "./shells/components/RouteErrorPage.js";

/** Performer / Client-only SPA — no Admin or Timeline modules. */
const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    children: [
      { path: "/", element: <Navigate to="/client" replace /> },
      { path: "/client", element: <ClientShell /> },
      { path: "*", element: <Navigate to="/client" replace /> },
    ],
  },
]);

export default function AppClient() {
  return (
    <TransportProvider>
      <MemoryPressureBanner />
      <DeviceNameGate>
        <RouterProvider router={router} />
      </DeviceNameGate>
    </TransportProvider>
  );
}
