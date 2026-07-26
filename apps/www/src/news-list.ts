import { htmlWithBrandWordmarks, setTextWithBrand } from "./brand.js";
import { iconSvg } from "./icons.js";
import { spotlightsByEra, type ReleaseSpotlight } from "./news/content";
import { fillBrand, fillNav } from "./site";
import "./styles.css";

const brand = document.querySelector<HTMLAnchorElement>("[data-brand]");
const nav = document.querySelector<HTMLElement>("[data-nav]");
if (brand) fillBrand(brand);
if (nav) fillNav(nav, "news");

function appendCard(list: HTMLElement, release: ReleaseSpotlight): void {
  const li = document.createElement("li");
  li.className = `release-card reveal${release.era === "archive" ? " release-card--archive" : ""}`;

  const head = document.createElement("div");
  head.className = "release-card__head";

  const badge = document.createElement("span");
  badge.className = "release-card__badge";
  badge.textContent = release.badge;

  const meta = document.createElement("div");
  meta.className = "release-card__meta";

  const name = document.createElement("h3");
  name.className = "release-card__name";
  name.textContent = release.name;

  const when = document.createElement("time");
  when.className = "release-card__date";
  when.dateTime = release.dateIso;
  when.textContent = release.date;

  meta.append(name, when);
  head.append(badge, meta);

  const summary = document.createElement("p");
  summary.className = "release-card__summary";
  setTextWithBrand(summary, release.summary);

  const chips = document.createElement("ul");
  chips.className = "release-card__chips";
  for (const item of release.highlights) {
    const chip = document.createElement("li");
    chip.className = "release-chip";
    chip.innerHTML = `${iconSvg(item.icon, "release-chip__icon")}<span>${htmlWithBrandWordmarks(item.label)}</span>`;
    chips.append(chip);
  }

  li.append(head, summary, chips);

  if (release.releaseUrl) {
    const link = document.createElement("a");
    link.className = "release-card__gh";
    link.href = release.releaseUrl;
    link.rel = "noopener noreferrer";
    link.target = "_blank";
    link.textContent =
      release.linkLabel ??
      (release.era === "archive"
        ? "Zobacz w archiwum ↗"
        : "Szczegółowy wykaz zmian na GitHub ↗");
    li.append(link);
  }

  list.append(li);
}

function fillList(listId: string, era: "current" | "archive"): void {
  const list = document.querySelector<HTMLElement>(`#${listId}`);
  if (!list) return;
  list.replaceChildren();
  for (const release of spotlightsByEra(era)) {
    appendCard(list, release);
  }
}

fillList("news-list", "current");
fillList("archive-list", "archive");

document.querySelectorAll(".reveal").forEach((el) => {
  el.classList.add("is-visible");
});
