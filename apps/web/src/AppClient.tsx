import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { TransportProvider } from "./transport/TransportProvider.js";
import { ClientShell } from "./shells/ClientShell.js";
import { DeviceNameGate } from "./shells/DeviceNameGate.js";
import { MemoryPressureBanner } from "./shells/MemoryPressureBanner.js";
import { RouteErrorPage } from "./shells/RouteErrorPage.js";

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
