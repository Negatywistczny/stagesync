import { iconSvg } from "./icons.js";
import { spotlightsNewestFirst } from "./news/content";
import { fillBrand, fillNav } from "./site";
import "./styles.css";

const brand = document.querySelector<HTMLAnchorElement>("[data-brand]");
const nav = document.querySelector<HTMLElement>("[data-nav]");
if (brand) fillBrand(brand);
if (nav) fillNav(nav, "news");

const list = document.querySelector<HTMLElement>("#news-list");
if (list) {
  list.replaceChildren();
  for (const release of spotlightsNewestFirst()) {
    const li = document.createElement("li");
    li.className = "release-card reveal";

    const head = document.createElement("div");
    head.className = "release-card__head";

    const badge = document.createElement("span");
    badge.className = "release-card__badge";
    badge.textContent = release.badge;

    const meta = document.createElement("div");
    meta.className = "release-card__meta";

    const name = document.createElement("h2");
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
    summary.textContent = release.summary;

    const chips = document.createElement("ul");
    chips.className = "release-card__chips";
    for (const item of release.highlights) {
      const chip = document.createElement("li");
      chip.className = "release-chip";
      chip.innerHTML = `${iconSvg(item.icon, "release-chip__icon")}<span>${item.label}</span>`;
      chips.append(chip);
    }

    const link = document.createElement("a");
    link.className = "release-card__gh";
    link.href = release.releaseUrl;
    link.rel = "noopener noreferrer";
    link.target = "_blank";
    link.textContent = "Szczegółowy wykaz zmian na GitHub ↗";

    li.append(head, summary, chips, link);
    list.append(li);
  }
}

document.querySelectorAll(".reveal").forEach((el) => {
  el.classList.add("is-visible");
});
