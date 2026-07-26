import { articleBySlug } from "./news/content";
import { fillBrand, fillNav, siteBase } from "./site";
import "./styles.css";

const slug = document.body.dataset.slug ?? "";
const article = articleBySlug(slug);

const brand = document.querySelector<HTMLAnchorElement>("[data-brand]");
const nav = document.querySelector<HTMLElement>("[data-nav]");
if (brand) fillBrand(brand);
if (nav) fillNav(nav, "news");

const root = document.querySelector<HTMLElement>("#article");
const back = document.querySelector<HTMLAnchorElement>("[data-back]");
if (back) back.href = `${siteBase()}aktualnosci/`;

if (!root) {
  // no-op
} else if (!article) {
  document.title = "Nie znaleziono — StageSync";
  root.innerHTML = `<p class="news-missing">Nie znaleźliśmy tego wpisu. <a href="${siteBase()}aktualnosci/">Wróć do aktualności</a>.</p>`;
} else {
  document.title = `${article.title} — StageSync`;
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute("content", article.teaser);

  const time = document.createElement("time");
  time.className = "news-article__date";
  time.dateTime = `${article.date}-01`;
  time.textContent = article.date;

  const h1 = document.createElement("h1");
  h1.className = "news-article__title";
  h1.id = "article-title";
  h1.textContent = article.title;

  const lead = document.createElement("p");
  lead.className = "news-article__lead";
  lead.textContent = article.teaser;

  root.replaceChildren(time, h1, lead);
  for (const paragraph of article.body) {
    const p = document.createElement("p");
    p.className = "news-article__p";
    p.textContent = paragraph;
    root.append(p);
  }

  const cta = document.createElement("p");
  cta.className = "news-article__cta";
  const ctaLink = document.createElement("a");
  ctaLink.className = "btn btn--primary";
  ctaLink.href = `${siteBase()}#download`;
  ctaLink.textContent = "Pobierz StageSync";
  cta.append(ctaLink);
  root.append(cta);
}
