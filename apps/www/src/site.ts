/** Shared site chrome helpers (nav URLs respect Vite base). */

export function siteBase(): string {
  return import.meta.env.BASE_URL;
}

export type NavId = "home" | "news" | "download";

export function fillNav(nav: HTMLElement, active: NavId): void {
  const base = siteBase();
  const items: { id: NavId; href: string; label: string }[] = [
    { id: "home", href: base, label: "Start" },
    { id: "news", href: `${base}aktualnosci/`, label: "Aktualności" },
    { id: "download", href: `${base}#download`, label: "Pobierz" },
  ];

  nav.replaceChildren();
  for (const item of items) {
    const a = document.createElement("a");
    a.href = item.href;
    a.textContent = item.label;
    if (item.id === active) a.setAttribute("aria-current", "page");
    nav.append(a);
  }
}

export function fillBrand(link: HTMLAnchorElement): void {
  link.href = siteBase();
}
