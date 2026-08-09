/** Horizontal preview rail + lightbox for landing screenshots. */

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

let dialog: HTMLDialogElement | null = null;
let imgEl: HTMLImageElement | null = null;
let captionEl: HTMLElement | null = null;
let lastFocus: HTMLElement | null = null;

function ensureLightbox(): HTMLDialogElement {
  if (dialog) return dialog;

  dialog = el("dialog", "preview-lightbox");
  dialog.setAttribute("aria-label", "Podgląd ekranu");

  const card = el("div", "preview-lightbox__card");
  card.addEventListener("click", (event) => event.stopPropagation());

  const close = el("button", "preview-lightbox__close");
  close.type = "button";
  close.setAttribute("aria-label", "Zamknij");
  close.textContent = "×";
  close.addEventListener("click", () => dialog?.close());

  imgEl = el("img", "preview-lightbox__img");
  imgEl.alt = "";

  captionEl = el("p", "preview-lightbox__caption");

  card.append(close, imgEl, captionEl);
  dialog.append(card);

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog?.close();
  });
  dialog.addEventListener("close", () => {
    document.body.classList.remove("has-modal");
    lastFocus?.focus();
    lastFocus = null;
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    dialog?.close();
  });

  document.body.append(dialog);
  return dialog;
}

function openLightbox(button: HTMLButtonElement): void {
  const src = button.dataset.previewSrc;
  if (!src || !dialog || !imgEl || !captionEl) return;
  lastFocus = button;
  imgEl.src = src;
  imgEl.alt =
    button.querySelector("img")?.alt ?? button.dataset.previewLabel ?? "";
  captionEl.textContent = button.dataset.previewLabel ?? "";
  document.body.classList.add("has-modal");
  if (!dialog.open) dialog.showModal();
}

function scrollTrack(track: HTMLElement, direction: -1 | 1): void {
  const amount = Math.max(track.clientWidth * 0.78, 280);
  track.scrollBy({ left: direction * amount, behavior: "smooth" });
}

function syncNavButtons(
  track: HTMLElement,
  prev: HTMLButtonElement | null,
  next: HTMLButtonElement | null,
): void {
  const max = track.scrollWidth - track.clientWidth;
  const atStart = track.scrollLeft <= 4;
  const atEnd = track.scrollLeft >= max - 4;
  if (prev) prev.disabled = atStart || max <= 0;
  if (next) next.disabled = atEnd || max <= 0;
}

function mountRail(root: ParentNode): void {
  const track = root.querySelector<HTMLElement>("#preview-track");
  if (!track) return;

  const prev = root.querySelector<HTMLButtonElement>("[data-preview-prev]");
  const next = root.querySelector<HTMLButtonElement>("[data-preview-next]");

  const update = () => syncNavButtons(track, prev, next);
  update();
  track.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);

  prev?.addEventListener("click", () => scrollTrack(track, -1));
  next?.addEventListener("click", () => scrollTrack(track, 1));

  track.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollTrack(track, -1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollTrack(track, 1);
    }
  });
}

export function mountPreviewLightbox(root: ParentNode = document): void {
  const buttons =
    root.querySelectorAll<HTMLButtonElement>("[data-preview-src]");
  if (!buttons.length) return;

  ensureLightbox();
  mountRail(root);

  for (const button of buttons) {
    button.addEventListener("click", () => openLightbox(button));
  }
}
