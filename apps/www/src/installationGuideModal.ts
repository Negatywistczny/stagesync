import { setTextWithBrand } from "./brand.js";
import { iconSvg } from "./icons.js";

export type InstallGuideTab = "macos" | "windows" | "android";

interface InstallStep {
  text: string;
  /** Exact shell / path snippet shown under the step (e.g. macOS quarantine). */
  code?: string;
}

const TABS: { id: InstallGuideTab; label: string }[] = [
  { id: "macos", label: "macOS" },
  { id: "windows", label: "Windows" },
  { id: "android", label: "Android (APK)" },
];

const STEPS: Record<InstallGuideTab, InstallStep[]> = {
  macos: [
    {
      text: "Otwórz pobrany plik .dmg i przeciągnij StageSync do folderu Aplikacje.",
    },
    {
      text: "Otwórz Terminal (Spotlight: Terminal) i wklej poniższą komendę — bez niej macOS często blokuje aplikację, czasem z mylącym komunikatem „uszkodzona”:",
      code: "xattr -cr /Applications/StageSync.app\nopen /Applications/StageSync.app",
    },
    {
      text: "Tę samą komendę uruchom ponownie po każdej świeżej instalacji z .dmg.",
    },
    {
      text: "Jeśli wolisz bez Terminala: prawy klik na StageSync → Otwórz → Otwórz, albo Ustawienia systemowe → Prywatność i ochrona → Otwórz mimo to.",
    },
  ],
  windows: [
    { text: "Uruchom pobrany plik .exe (NSIS) i przejdź przez instalator." },
    {
      text: "Gdy pojawi się SmartScreen: kliknij Więcej informacji → Uruchom mimo to.",
    },
  ],
  android: [
    { text: "Otwórz pobrany plik .apk." },
    {
      text: "Zezwól na instalację aplikacji z tego źródła w ustawieniach Androida (gdy system o to poprosi).",
    },
    {
      text: "(Opcjonalnie) Jeśli Play Protect blokuje instalację: otwórz Sklep Play → ikona profilu → Ochrona (Play Protect) → Ustawienia (koło zębate) → wyłącz „Skanuj aplikacje za pomocą Play Protect”. Po instalacji możesz włączyć ochronę z powrotem. Przy jednorazowym ostrzeżeniu wystarczy często Więcej szczegółów → Zainstaluj mimo to.",
    },
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

function renderStep(step: InstallStep): HTMLLIElement {
  const li = el("li", "install-guide__step");
  const text = el("p", "install-guide__step-text");
  setTextWithBrand(text, step.text);
  li.append(text);
  if (step.code) {
    const wrap = el("div", "install-guide__code-wrap");
    const pre = el("pre", "install-guide__code");
    const code = el("code", undefined, step.code);
    pre.append(code);

    const copy = el("button", "install-guide__copy", "Kopiuj");
    copy.type = "button";
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(step.code!);
        copy.textContent = "Skopiowano";
        window.setTimeout(() => {
          copy.textContent = "Kopiuj";
        }, 1600);
      } catch {
        copy.textContent = "Zaznacz ręcznie";
        window.setTimeout(() => {
          copy.textContent = "Kopiuj";
        }, 2000);
      }
    });

    wrap.append(pre, copy);
    li.append(wrap);
  }
  return li;
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
      list.append(renderStep(step));
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
