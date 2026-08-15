import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AppConsole from "./AppConsole";
import {
  bootHostThemeDefault,
  initAppearance,
} from "@lib/client/appearance.js";
import { initClientEasterEggs } from "@lib/client/easter-eggs.js";
import { AppErrorBoundary } from "./shells/components/AppErrorBoundary.js";
import "./index.css";

initAppearance();
bootHostThemeDefault();
initClientEasterEggs();

if ("serviceWorker" in navigator) {
  if (
    import.meta.env.DEV ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        void reg.unregister();
      }
    });
  } else {
    window.addEventListener("load", () => {
      void navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("[PWA] service worker registration failed", err);
      });
    });
  }
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
      <AppConsole />
    </AppErrorBoundary>
  </StrictMode>,
);
