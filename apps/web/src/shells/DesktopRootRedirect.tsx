import { Navigate } from "react-router-dom";

/** Default entry: performer / browser landing on Client (not Admin). */
export function DesktopRootRedirect() {
  return <Navigate to="/client" replace />;
}
