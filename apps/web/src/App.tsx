import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { TransportProvider } from "./transport/TransportProvider.js";
import { AdminShell } from "./shells/AdminShell.js";
import { ClientShell } from "./shells/ClientShell.js";
import { DesktopMenuBridge } from "./shells/DesktopMenuBridge.js";
import { DesktopRootRedirect } from "./shells/DesktopRootRedirect.js";
import { RouteErrorPage } from "./shells/RouteErrorPage.js";
import { TimelineShell } from "./shells/TimelineShell.js";

const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    element: <DesktopMenuBridge />,
    children: [
      { path: "/", element: <DesktopRootRedirect /> },
      { path: "/client", element: <ClientShell /> },
      { path: "/admin", element: <AdminShell /> },
      { path: "/timeline/:projectId", element: <TimelineShell /> },
      { path: "/timeline", element: <Navigate to="/admin" replace /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  return (
    <TransportProvider>
      <RouterProvider router={router} />
    </TransportProvider>
  );
}
