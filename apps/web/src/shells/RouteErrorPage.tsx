import { useRouteError } from "react-router-dom";
import { AppCrashFallback } from "./AppCrashFallback.js";

/** React Router `errorElement` — catches route render / loader / action throws. */
export function RouteErrorPage() {
  const error = useRouteError();
  return <AppCrashFallback error={error} />;
}
