import "./styles.css";
import { fetchLatestOffers, type DownloadOffer } from "./releases.js";

function renderOffers(offers: DownloadOffer[]): void {
  const grid = document.querySelector<HTMLElement>("#download-grid");
  if (!grid) return;

  grid.replaceChildren();
  for (const offer of offers) {
    const item = document.createElement("div");
    item.className = "download__item reveal is-visible";

    const title = document.createElement("strong");
    title.textContent = offer.label;

    const hint = document.createElement("span");
    hint.textContent = offer.hint;

    const link = document.createElement("a");
    link.className = "btn btn--primary btn--block";
    link.href = offer.url;
    link.rel = "noopener noreferrer";
    link.textContent = "Pobierz";

    item.append(title, hint, link);
    grid.append(item);
  }

  grid.hidden = offers.length === 0;
}

function setStatus(message: string | null, state: "error" | "ok" = "error"): void {
  const el = document.querySelector<HTMLElement>("#download-status");
  if (!el) return;
  if (!message) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = message;
  el.dataset.state = state;
}

async function hydrateDownloads(): Promise<void> {
  try {
    const { offers } = await fetchLatestOffers();
    if (offers.length === 0) {
      setStatus("Brak gotowych instalatorów w najnowszym wydaniu. Sprawdź starsze wersje poniżej.");
      return;
    }
    setStatus(null);
    renderOffers(offers);
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
