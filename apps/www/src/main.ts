import "./styles.css";
import { loadChannels } from "./channels.js";
import { hydrateDataIcons, iconSvg, platformIconSvg } from "./icons.js";
import {
  catalogHasAny,
  fetchLatestCatalog,
  type DownloadCatalog,
  type DownloadOffer,
} from "./releases.js";

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

  if (offer.helpUrl && offer.helpLabel) {
    const help = el("a", "dl-card__help");
    help.href = offer.helpUrl;
    help.rel = "noopener noreferrer";
    help.innerHTML = `${iconSvg("file-text", "dl-card__help-icon")}<span>${offer.helpLabel}</span>`;
    actions.append(help);
  }

  card.append(actions);
  return card;
}

function renderUnavailable(
  title: string,
  subtitle: string,
  icon: DownloadOffer["icon"],
  help?: { label: string; url: string },
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
  card.append(el("p", "dl-card__detail", "Niedostępne w najnowszym wydaniu."));
  if (help) {
    const actions = el("div", "dl-card__actions");
    const link = el("a", "dl-card__help");
    link.href = help.url;
    link.rel = "noopener noreferrer";
    link.innerHTML = `${iconSvg("file-text", "dl-card__help-icon")}<span>${help.label}</span>`;
    actions.append(link);
    card.append(actions);
  }
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

  const docs = catalog.channels.docs;
  const desktopHelp = { label: "Jak zainstalować na komputerze", url: docs.desktop };
  const mobileHelp = { label: "Jak zainstalować na tablecie", url: docs.mobile };

  const desktopCards: HTMLElement[] = [];
  if (catalog.desktop.windows) {
    desktopCards.push(renderCard(catalog.desktop.windows));
  } else {
    desktopCards.push(renderUnavailable("Windows", "Aplikacja główna (stacja robocza)", "windows", desktopHelp));
  }

  if (catalog.desktop.macosArm) {
    desktopCards.push(
      renderCard(catalog.desktop.macosArm, { secondary: catalog.desktop.macosIntel }),
    );
  } else if (catalog.desktop.macosIntel) {
    desktopCards.push(renderCard(catalog.desktop.macosIntel));
  } else {
    desktopCards.push(renderUnavailable("macOS", "Aplikacja główna (stacja robocza)", "apple", desktopHelp));
  }

  root.append(
    renderCategory(
      "Aplikacja główna (stacja robocza)",
      "Windows i Mac — stąd sterujesz setlistą.",
      desktopCards,
    ),
  );

  const androidCards: HTMLElement[] = [];
  if (catalog.android.console) {
    androidCards.push(renderCard(catalog.android.console));
  } else {
    androidCards.push(renderUnavailable("Console", "Realizator / Lider", "console", mobileHelp));
  }
  if (catalog.android.performer) {
    androidCards.push(renderCard(catalog.android.performer));
  } else {
    androidCards.push(renderUnavailable("Performer", "Muzyk na scenie", "performer", mobileHelp));
  }

  root.append(
    renderCategory(
      "Tablety na scenie",
      "Console do zarządzania setlistą, Performer dla muzyków — ta sama sieć Wi‑Fi.",
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
        "Brak gotowych instalatorów w najnowszym wydaniu.",
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

hydrateDataIcons();
observeReveals();
void hydrateDownloads();
