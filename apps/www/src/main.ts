import "./styles.css";
import { loadChannels } from "./channels.js";
import { hydrateDataIcons, platformIconSvg } from "./icons.js";
import {
  createInstallHelpButton,
  ensureInstallationGuide,
  type InstallGuideTab,
} from "./installationGuideModal.js";
import {
  catalogHasAny,
  fetchLatestCatalog,
  type DownloadCatalog,
  type DownloadOffer,
} from "./releases.js";
import { fillBrand, fillNav } from "./site.js";

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

function renderCard(offer: DownloadOffer, options?: { secondary?: DownloadOffer | null }): HTMLElement {
  const card = el("article", "dl-card reveal is-visible");

  const head = el("div", "dl-card__head");
  const iconWrap = el("div", "dl-card__icon");
  iconWrap.dataset.platform = offer.icon;
  iconWrap.innerHTML = platformIconSvg(offer.icon);
  head.append(iconWrap);

  const titles = el("div", "dl-card__titles");
  titles.append(el("h3", "dl-card__title", offer.title));
  titles.append(el("p", "dl-card__subtitle", offer.subtitle));
  head.append(titles);
  card.append(head);

  card.append(el("p", "dl-card__detail", offer.detail));

  const actions = el("div", "dl-card__actions");
  const primary = el("a", "btn btn--primary btn--block", offer.cta);
  primary.href = offer.url;
  primary.rel = "noopener noreferrer";
  actions.append(primary);

  if (options?.secondary) {
    const secondary = el("a", "dl-card__alt", options.secondary.cta);
    secondary.href = options.secondary.url;
    secondary.rel = "noopener noreferrer";
    secondary.textContent = `${options.secondary.cta} — ${options.secondary.detail}`;
    actions.append(secondary);
  }

  if (offer.helpLabel && offer.installTab) {
    actions.append(createInstallHelpButton(offer.helpLabel, offer.installTab));
  }

  card.append(actions);
  return card;
}

function renderUnavailable(
  title: string,
  subtitle: string,
  icon: DownloadOffer["icon"],
  help: { label: string; tab: InstallGuideTab },
): HTMLElement {
  const card = el("article", "dl-card dl-card--empty reveal is-visible");
  const head = el("div", "dl-card__head");
  const iconWrap = el("div", "dl-card__icon");
  iconWrap.dataset.platform = icon;
  iconWrap.innerHTML = platformIconSvg(icon);
  head.append(iconWrap);
  const titles = el("div", "dl-card__titles");
  titles.append(el("h3", "dl-card__title", title));
  titles.append(el("p", "dl-card__subtitle", subtitle));
  head.append(titles);
  card.append(head);
  card.append(el("p", "dl-card__detail", "Niedostępne w\u00A0najnowszym wydaniu."));
  const actions = el("div", "dl-card__actions");
  actions.append(createInstallHelpButton(help.label, help.tab));
  card.append(actions);
  return card;
}

function renderCategory(title: string, lead: string, cards: HTMLElement[]): HTMLElement {
  const block = el("div", "dl-group reveal is-visible");
  const head = el("div", "dl-group__head");
  head.append(el("h3", "dl-group__title", title));
  head.append(el("p", "dl-group__lead", lead));
  block.append(head);

  const grid = el("div", "dl-group__grid");
  for (const card of cards) grid.append(card);
  block.append(grid);
  return block;
}

function renderCatalog(catalog: DownloadCatalog): void {
  const root = document.querySelector<HTMLElement>("#download-catalog");
  if (!root) return;
  root.replaceChildren();

  const desktopHelp = { label: "Jak zainstalować na komputerze", tab: "macos" as const };
  const tabletHelp = { label: "Jak zainstalować na tablecie", tab: "android" as const };

  const desktopCards: HTMLElement[] = [];
  if (catalog.desktop.windows) {
    desktopCards.push(renderCard(catalog.desktop.windows));
  } else {
    desktopCards.push(
      renderUnavailable("Windows", "Aplikacja główna (stacja robocza)", "windows", {
        label: desktopHelp.label,
        tab: "windows",
      }),
    );
  }

  if (catalog.desktop.macosArm) {
    desktopCards.push(
      renderCard(catalog.desktop.macosArm, { secondary: catalog.desktop.macosIntel }),
    );
  } else if (catalog.desktop.macosIntel) {
    desktopCards.push(renderCard(catalog.desktop.macosIntel));
  } else {
    desktopCards.push(
      renderUnavailable("macOS", "Aplikacja główna (stacja robocza)", "apple", desktopHelp),
    );
  }

  root.append(
    renderCategory(
      "Aplikacja główna (stacja robocza)",
      "Windows i\u00A0Mac — stąd sterujesz setlistą.",
      desktopCards,
    ),
  );

  const androidCards: HTMLElement[] = [];
  if (catalog.android.console) {
    androidCards.push(renderCard(catalog.android.console));
  } else {
    androidCards.push(renderUnavailable("Console", "Realizator / Lider", "console", tabletHelp));
  }
  if (catalog.android.performer) {
    androidCards.push(renderCard(catalog.android.performer));
  } else {
    androidCards.push(renderUnavailable("Performer", "Muzyk na scenie", "performer", tabletHelp));
  }

  root.append(
    renderCategory(
      "Android na scenie",
      "Console i Performer na telefonie lub tablecie — ta sama sieć Wi‑Fi.",
      androidCards,
    ),
  );

  root.hidden = false;
  root.setAttribute("aria-busy", "false");
}

function setStatus(message: string | null, releaseUrl?: string): void {
  const elStatus = document.querySelector<HTMLElement>("#download-status");
  if (!elStatus) return;
  elStatus.replaceChildren();
  if (!message) {
    elStatus.hidden = true;
    return;
  }
  elStatus.hidden = false;
  elStatus.append(document.createTextNode(message));
  if (releaseUrl) {
    elStatus.append(document.createTextNode(" "));
    const link = el("a", undefined, "Zobacz starsze wersje");
    link.href = releaseUrl;
    link.rel = "noopener noreferrer";
    elStatus.append(link);
  }
}

async function hydrateDownloads(): Promise<void> {
  const channels = await loadChannels();
  const fallback = document.querySelector<HTMLAnchorElement>("#download-fallback-link");
  if (fallback) fallback.href = channels.releases;

  try {
    const catalog = await fetchLatestCatalog();
    if (!catalogHasAny(catalog)) {
      setStatus(
        "Brak gotowych instalatorów w\u00A0najnowszym wydaniu.",
        catalog.releaseUrl,
      );
      return;
    }
    setStatus(null);
    renderCatalog(catalog);
  } catch {
    setStatus("Nie udało się pobrać listy wydań.", channels.releases);
  }
}

function observeReveals(): void {
  const nodes = document.querySelectorAll<HTMLElement>(".reveal");
  if (!("IntersectionObserver" in window)) {
    nodes.forEach((n) => n.classList.add("is-visible"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
  );

  nodes.forEach((n) => io.observe(n));
}

const brand = document.querySelector<HTMLAnchorElement>("[data-brand]");
const nav = document.querySelector<HTMLElement>("[data-nav]");
if (brand) fillBrand(brand);
if (nav) fillNav(nav, "home");

ensureInstallationGuide();
hydrateDataIcons();
observeReveals();
void hydrateDownloads();
