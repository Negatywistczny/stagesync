import "./styles.css";
import { platformIconSvg } from "./icons.js";
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

  card.append(actions);
  return card;
}

function renderUnavailable(title: string, subtitle: string, icon: DownloadOffer["icon"]): HTMLElement {
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
  return card;
}

function renderCategory(
  title: string,
  lead: string,
  cards: HTMLElement[],
): HTMLElement {
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

  const desktopCards: HTMLElement[] = [];
  if (catalog.desktop.windows) {
    desktopCards.push(renderCard(catalog.desktop.windows));
  } else {
    desktopCards.push(renderUnavailable("Windows", "Stacja robocza", "windows"));
  }

  if (catalog.desktop.macosArm) {
    desktopCards.push(
      renderCard(catalog.desktop.macosArm, { secondary: catalog.desktop.macosIntel }),
    );
  } else if (catalog.desktop.macosIntel) {
    desktopCards.push(renderCard(catalog.desktop.macosIntel));
  } else {
    desktopCards.push(renderUnavailable("macOS", "Apple Silicon", "apple"));
  }

  root.append(
    renderCategory(
      "Stacje robocze",
      "Desktop dla operatora — Windows i macOS.",
      desktopCards,
    ),
  );

  const androidCards: HTMLElement[] = [];
  if (catalog.android.console) {
    androidCards.push(renderCard(catalog.android.console));
  } else {
    androidCards.push(renderUnavailable("Console", "Operator / FOH", "console"));
  }
  if (catalog.android.performer) {
    androidCards.push(renderCard(catalog.android.performer));
  } else {
    androidCards.push(renderUnavailable("Performer", "Muzyk na scenie", "performer"));
  }

  root.append(
    renderCategory(
      "Aplikacje sceniczne",
      "Android na tablecie — Console przy FOH, Performer na scenie.",
      androidCards,
    ),
  );

  root.hidden = false;
}

function setStatus(message: string | null): void {
  const elStatus = document.querySelector<HTMLElement>("#download-status");
  if (!elStatus) return;
  if (!message) {
    elStatus.hidden = true;
    elStatus.textContent = "";
    return;
  }
  elStatus.hidden = false;
  elStatus.textContent = message;
}

async function hydrateDownloads(): Promise<void> {
  try {
    const catalog = await fetchLatestCatalog();
    if (!catalogHasAny(catalog)) {
      setStatus("Brak gotowych instalatorów w najnowszym wydaniu. Sprawdź starsze wersje poniżej.");
      return;
    }
    setStatus(null);
    renderCatalog(catalog);
  } catch {
    setStatus("Nie udało się pobrać listy wydań. Skorzystaj z linku do starszych wersji poniżej.");
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

observeReveals();
void hydrateDownloads();
