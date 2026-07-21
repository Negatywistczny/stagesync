import { Navigate } from "react-router-dom";
import { isDesktopShell } from "../lib/desktopBridge.js";
import { ClientShell } from "./ClientShell.js";

/** Desktop shell (ADR 0010): operator window → Admin; browser/tablet → Client. */
export function DesktopRootRedirect() {
  if (isDesktopShell()) {
    return <Navigate to="/admin" replace />;
  }
  return <ClientShell />;
}
