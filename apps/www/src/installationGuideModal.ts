import { iconSvg } from "./icons.js";

export type InstallGuideTab = "macos" | "windows" | "android";

const TABS: { id: InstallGuideTab; label: string }[] = [
  { id: "macos", label: "macOS" },
  { id: "windows", label: "Windows" },
  { id: "android", label: "Android (APK)" },
];

const STEPS: Record<InstallGuideTab, string[]> = {
  macos: [
    "Przeciągnij aplikację do folderu Aplikacje.",
    "Jeśli zobaczysz ostrzeżenie Gatekeepera: kliknij ikonę prawym przyciskiem myszy → Otwórz.",
    "Potwierdź klikając Otwórz mimo to.",
  ],
  windows: [
    "Uruchom plik .msi.",
    "W przypadku komunikatu SmartScreen kliknij Więcej informacji → Uruchom mimo to.",
  ],
  android: [
    "Otwórz pobrany plik .apk.",
    "Zezwól na instalację aplikacji z tego źródła w ustawieniach Androida.",
  ],
};

let dialog: HTMLDialogElement | null = null;
let tabButtons = new Map<InstallGuideTab, HTMLButtonElement>();
let panels = new Map<InstallGuideTab, HTMLElement>();
let activeTab: InstallGuideTab = "macos";
let lastFocus: HTMLElement | null = null;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function setActiveTab(tab: InstallGuideTab): void {
  activeTab = tab;
  for (const [id, button] of tabButtons) {
    const selected = id === tab;
    button.setAttribute("aria-selected", selected ? "true" : "false");
    button.tabIndex = selected ? 0 : -1;
    button.classList.toggle("install-guide__tab--active", selected);
  }
  for (const [id, panel] of panels) {
    const selected = id === tab;
    panel.hidden = !selected;
    panel.classList.toggle("install-guide__panel--active", selected);
  }
}

function closeGuide(): void {
  if (!dialog?.open) return;
  dialog.close();
}

function onDialogClose(): void {
  document.body.classList.remove("has-modal");
  lastFocus?.focus();
  lastFocus = null;
}

function buildDialog(): HTMLDialogElement {
  const root = el("dialog", "install-guide");
  root.setAttribute("aria-labelledby", "install-guide-title");

  const card = el("div", "install-guide__card");
  card.addEventListener("click", (event) => event.stopPropagation());

  const header = el("div", "install-guide__header");
  const title = el("h2", "install-guide__title", "Jak zainstalować");
  title.id = "install-guide-title";

  const closeBtn = el("button", "install-guide__close");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Zamknij");
  closeBtn.innerHTML = `${iconSvg("x", "install-guide__close-icon")}`;
  closeBtn.addEventListener("click", () => closeGuide());

  header.append(title, closeBtn);

  const tablist = el("div", "install-guide__tabs");
  tablist.setAttribute("role", "tablist");
  tablist.setAttribute("aria-label", "Platforma");

  const body = el("div", "install-guide__body");

  for (const tab of TABS) {
    const button = el("button", "install-guide__tab", tab.label);
    button.type = "button";
    button.id = `install-tab-${tab.id}`;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-controls", `install-panel-${tab.id}`);
    button.addEventListener("click", () => setActiveTab(tab.id));
    button.addEventListener("keydown", (event) => {
      const order = TABS.map((t) => t.id);
      const index = order.indexOf(tab.id);
      let next: InstallGuideTab | null = null;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        next = order[(index + 1) % order.length] ?? null;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        next = order[(index - 1 + order.length) % order.length] ?? null;
      } else if (event.key === "Home") {
        next = order[0] ?? null;
      } else if (event.key === "End") {
        next = order[order.length - 1] ?? null;
      }
      if (!next) return;
      event.preventDefault();
      setActiveTab(next);
      tabButtons.get(next)?.focus();
    });
    tabButtons.set(tab.id, button);
    tablist.append(button);

    const panel = el("div", "install-guide__panel");
    panel.id = `install-panel-${tab.id}`;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", `install-tab-${tab.id}`);
    panel.hidden = true;

    const list = el("ol", "install-guide__steps");
    for (const step of STEPS[tab.id]) {
      list.append(el("li", "install-guide__step", step));
    }
    panel.append(list);
    panels.set(tab.id, panel);
    body.append(panel);
  }

  card.append(header, tablist, body);
  root.append(card);

  root.addEventListener("click", (event) => {
    if (event.target === root) closeGuide();
  });
  root.addEventListener("cancel", (event) => {
    // Native dialog already closes on Esc; keep default, just ensure cleanup via close event.
    event.preventDefault();
    closeGuide();
  });
  root.addEventListener("close", onDialogClose);

  return root;
}

/** Mount once; safe to call repeatedly. */
export function ensureInstallationGuide(): void {
  if (dialog) return;
  tabButtons = new Map();
  panels = new Map();
  dialog = buildDialog();
  document.body.append(dialog);
  setActiveTab("macos");
}

export function openInstallationGuide(tab: InstallGuideTab): void {
  ensureInstallationGuide();
  if (!dialog) return;
  lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  setActiveTab(tab);
  document.body.classList.add("has-modal");
  if (!dialog.open) dialog.showModal();
  tabButtons.get(tab)?.focus();
}

export function createInstallHelpButton(
  label: string,
  tab: InstallGuideTab,
): HTMLButtonElement {
  const help = el("button", "dl-card__help");
  help.type = "button";
  help.innerHTML = `${iconSvg("file-text", "dl-card__help-icon")}<span>${label}</span>`;
  help.addEventListener("click", () => openInstallationGuide(tab));
  return help;
}
