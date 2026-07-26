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

function setStatus(message: string, state: "loading" | "ok" | "error" = "loading"): void {
  const el = document.querySelector<HTMLElement>("#download-status");
  if (!el) return;
  el.textContent = message;
  el.dataset.state = state;
}

async function hydrateDownloads(): Promise<void> {
  try {
    const { versionLabel, releaseUrl, offers } = await fetchLatestOffers();
    if (offers.length === 0) {
      setStatus(
        `Wydanie ${versionLabel} nie ma jeszcze rozpoznanych instalatorów — zobacz Releases.`,
        "error",
      );
      return;
    }
    setStatus(`Najnowsze wydanie: ${versionLabel}`, "ok");
    renderOffers(offers);

    const status = document.querySelector("#download-status");
    if (status) {
      const link = document.createElement("a");
      link.href = releaseUrl;
      link.rel = "noopener noreferrer";
      link.textContent = "szczegóły na GitHub";
      status.append(" · ", link);
    }
  } catch {
    setStatus(
      "Nie udało się odczytać Releases (sieć / API). Użyj linku do GitHub poniżej.",
      "error",
    );
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
