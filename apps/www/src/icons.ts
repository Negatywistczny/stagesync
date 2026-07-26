import type { PlatformIcon } from "./releases.js";

/** Lucide-style stroke icons (24×24) — currentColor, sized via CSS. */

export type IconName =
  | "refresh-cw"
  | "list-music"
  | "tablet"
  | "laptop"
  | "sliders-horizontal"
  | "sliders"
  | "music"
  | "mic-2"
  | "download"
  | "list-plus"
  | "wifi"
  | "file-text"
  | "x"
  | "windows"
  | "apple";

const PATHS: Record<IconName, string> = {
  "refresh-cw":
    '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  "list-music":
    '<path d="M21 15V6"/><path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/><path d="M12 12H3"/><path d="M16 6H3"/><path d="M12 18H3"/>',
  tablet:
    '<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><line x1="12" x2="12.01" y1="18" y2="18"/>',
  laptop:
    '<path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/>',
  "sliders-horizontal":
    '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
  sliders:
    '<line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/>',
  music:
    '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  "mic-2":
    '<path d="m12 8-2.5 5"/><path d="m15 8 2.5 5"/><path d="M17.5 12a5.5 5.5 0 1 1-11 0v-1.636a1 1 0 0 1 .192-.627l2.5-3.273a1 1 0 0 1 1.616 0l2.5 3.273a1 1 0 0 1 .192.627z"/><path d="M20 12v1a8 8 0 1 1-16 0v-1"/><path d="M12 19v3"/>',
  download:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  "list-plus":
    '<path d="M11 12H3"/><path d="M16 6H3"/><path d="M16 18H3"/><path d="M18 9v6"/><path d="M21 12h-6"/>',
  wifi: '<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/>',
  "file-text":
    '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  windows:
    '<path fill="currentColor" stroke="none" d="M3 5.5 10.2 4.4v7.1H3zm0 13 7.2 1.1v-7.2H3zm8.1-14.2L21 3v8.5h-9.9zm0 15.4L21 21v-8.6h-9.9z"/>',
  apple:
    '<path fill="currentColor" stroke="none" d="M16.7 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9-.7 0-1.9-.8-3.1-.8-1.6 0-3.1 1-3.9 2.5-1.7 2.9-.4 7.2 1.2 9.6.8 1.1 1.7 2.4 3 2.3 1.2 0 1.6-.8 3.1-.8s1.8.8 3.1.7c1.3 0 2.1-1.1 2.9-2.3.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.5-1-2.7-3.9zm-2.5-7.3c.6-.8 1.1-1.9.9-3-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-.9 2.9 1 .1 2-.5 2.7-1.3z"/>',
};

function strokeIcon(name: IconName, className: string): string {
  const filled = name === "windows" || name === "apple";
  const body = PATHS[name];
  if (filled) {
    return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;
  }
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

export function iconSvg(name: IconName, className = "icon"): string {
  return strokeIcon(name, className);
}

/** Platform marks on download cards. */
export function platformIconSvg(icon: PlatformIcon): string {
  switch (icon) {
    case "windows":
      return iconSvg("windows", "dl-card__glyph");
    case "apple":
      return iconSvg("apple", "dl-card__glyph");
    case "console":
      return iconSvg("sliders", "dl-card__glyph");
    case "performer":
      return iconSvg("mic-2", "dl-card__glyph");
  }
}

export function hydrateDataIcons(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>("[data-icon]").forEach((node) => {
    const name = node.dataset.icon as IconName | undefined;
    if (!name || !(name in PATHS)) return;
    const className = node.dataset.iconClass ?? "icon";
    node.innerHTML = iconSvg(name, className);
  });
}
