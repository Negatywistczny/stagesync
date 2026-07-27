import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { DevLayoutMatrix } from "./DevLayoutMatrix.js";
import { DevPreviewApp } from "./DevPreviewApp.js";

const devRouter = createBrowserRouter([
  { path: "/_dev/layouts", element: <DevLayoutMatrix /> },
  { path: "/_dev/preview", element: <DevPreviewApp /> },
  { path: "*", element: <DevLayoutMatrix /> },
]);

export function DevApp() {
  return <RouterProvider router={devRouter} />;
}
