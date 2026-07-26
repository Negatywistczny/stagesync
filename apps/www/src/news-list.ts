import { articlesNewestFirst } from "./news/content";
import { fillBrand, fillNav, siteBase } from "./site";
import "./styles.css";

const brand = document.querySelector<HTMLAnchorElement>("[data-brand]");
const nav = document.querySelector<HTMLElement>("[data-nav]");
if (brand) fillBrand(brand);
if (nav) fillNav(nav, "news");

const list = document.querySelector<HTMLElement>("#news-list");
if (list) {
  const base = siteBase();
  list.replaceChildren();
  for (const article of articlesNewestFirst()) {
    const li = document.createElement("li");
    li.className = "news-card reveal";
    const a = document.createElement("a");
    a.className = "news-card__link";
    a.href = `${base}aktualnosci/${article.slug}.html`;

    const time = document.createElement("time");
    time.className = "news-card__date";
    time.dateTime = `${article.date}-01`;
    time.textContent = article.date;

    const h2 = document.createElement("h2");
    h2.className = "news-card__title";
    h2.textContent = article.title;

    const p = document.createElement("p");
    p.className = "news-card__teaser";
    p.textContent = article.teaser;

    const more = document.createElement("span");
    more.className = "news-card__more";
    more.textContent = "Czytaj dalej";

    a.append(time, h2, p, more);
    li.append(a);
    list.append(li);
  }
}

document.querySelectorAll(".reveal").forEach((el) => {
  el.classList.add("is-visible");
});
