const DOCS_INSTALL_URL =
  "https://github.com/Negatywistczny/stagesync/blob/main/docs/guides/INSTALL.md";
const DOCS_ISSUES_URL = "https://github.com/Negatywistczny/stagesync/issues";

export const isMacUa = () => /Mac|iPhone|iPad/i.test(navigator.userAgent ?? "");

export async function windowPlugin(invoke, cmd, args = {}) {
  const win = window.__TAURI__?.window?.getCurrentWindow?.();
  if (cmd === "minimize" && win?.minimize) return win.minimize();
  if (cmd === "toggleMaximize" && win?.toggleMaximize) return win.toggleMaximize();
  if (cmd === "close" && win?.close) return win.close();
  if (cmd === "startDragging" && win?.startDragging) return win.startDragging();
  const label =
    window.__TAURI_INTERNALS__?.metadata?.currentWindow?.label ?? "main";
  const map = {
    minimize: "plugin:window|minimize",
    toggleMaximize: "plugin:window|toggle_maximize",
    close: "plugin:window|close",
    startDragging: "plugin:window|start_dragging",
  };
  return invoke(map[cmd], { label, ...args });
}

export async function openExternal(invoke, url) {
  try {
    await invoke("open_external_url", { url });
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function setLauncherMenuOpen(open) {
  const btn = document.getElementById("btnLauncherMenu");
  const drop = document.getElementById("launcherMenuDropdown");
  if (!btn || !drop) return;
  btn.setAttribute("aria-expanded", open ? "true" : "false");
  drop.hidden = !open;
}

export function installLauncherMenu({ onRefresh, onCheckUpdate, invoke }) {
  const root = document.getElementById("launcherMenuRoot");
  const btn = document.getElementById("btnLauncherMenu");
  const drop = document.getElementById("launcherMenuDropdown");
  if (!root || !btn || !drop) return;

  btn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    setLauncherMenuOpen(drop.hidden);
  });

  drop.querySelectorAll("[data-action]").forEach((node) => {
    node.addEventListener("click", () => {
      const action = node.getAttribute("data-action");
      setLauncherMenuOpen(false);
      if (action === "refresh") {
        void onRefresh();
        return;
      }
      if (action === "check-update") {
        void onCheckUpdate({ force: true });
        return;
      }
      if (action === "docs") {
        void openExternal(invoke, DOCS_INSTALL_URL);
        return;
      }
      if (action === "issues") {
        void openExternal(invoke, DOCS_ISSUES_URL);
        return;
      }
      if (action === "quit") {
        void invoke("quit_desktop_app", {}).catch(() => windowPlugin(invoke, "close"));
      }
    });
  });

  window.addEventListener("mousedown", (ev) => {
    if (!(ev.target instanceof Node)) return;
    if (root.contains(ev.target)) return;
    setLauncherMenuOpen(false);
  });
  window.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") setLauncherMenuOpen(false);
  });
}

export function installHtmlTitleBar(callbacks) {
  const bar = document.getElementById("titleBar");
  if (!bar || isMacUa()) return;
  bar.hidden = false;
  installLauncherMenu(callbacks);
  const { invoke } = callbacks;

  bar.addEventListener("mousedown", (ev) => {
    if (ev.button !== 0) return;
    const t = ev.target;
    if (!(t instanceof Element)) return;
    if (t.closest("button, [role='menu'], [role='menuitem']")) return;
    void windowPlugin(invoke, "startDragging").catch(() => {});
  });
  bar.addEventListener("dblclick", (ev) => {
    const t = ev.target;
    if (!(t instanceof Element)) return;
    if (t.closest("button, [role='menu'], [role='menuitem']")) return;
    void windowPlugin(invoke, "toggleMaximize").catch(() => {});
  });
  document.getElementById("btnWinMin")?.addEventListener("click", () => {
    void windowPlugin(invoke, "minimize").catch(() => {});
  });
  document.getElementById("btnWinMax")?.addEventListener("click", () => {
    void windowPlugin(invoke, "toggleMaximize").catch(() => {});
  });
  document.getElementById("btnWinClose")?.addEventListener("click", () => {
    void windowPlugin(invoke, "close").catch(() => {});
  });
}
