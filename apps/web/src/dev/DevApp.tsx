import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { DevLayoutMatrix } from "./DevLayoutMatrix.js";

const devRouter = createBrowserRouter([
  { path: "/_dev/layouts", element: <DevLayoutMatrix /> },
  { path: "*", element: <DevLayoutMatrix /> },
]);

export function DevApp() {
  return <RouterProvider router={devRouter} />;
}
