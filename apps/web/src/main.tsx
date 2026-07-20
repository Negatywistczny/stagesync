import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initAppearance } from "./lib/appearance.js";
import { AppErrorBoundary } from "./shells/AppErrorBoundary.js";
import "./index.css";

initAppearance();

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element #root not found");
}

createRoot(root).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
