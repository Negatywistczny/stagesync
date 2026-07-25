import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initAppearance } from "./lib/appearance.js";
import { AppErrorBoundary } from "./shells/AppErrorBoundary.js";
import "./index.css";

initAppearance();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("[PWA] service worker registration failed", err);
    });
  });
}

window.addEventListener("unhandledrejection", (event) => {
  console.error("[UNHANDLED PROMISE REJECTION]", event.reason);
});
window.addEventListener("error", (event) => {
  console.error("[UNCAUGHT ERROR]", event.error || event.message);
});

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
