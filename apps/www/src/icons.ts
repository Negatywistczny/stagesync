import type { PlatformIcon } from "./releases.js";

/** Inline platform marks — currentColor, sized via CSS. */
export function platformIconSvg(icon: PlatformIcon): string {
  switch (icon) {
    case "windows":
      return `<svg class="dl-card__glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M3 5.5 10.2 4.4v7.1H3zm0 13 7.2 1.1v-7.2H3zm8.1-14.2L21 3v8.5h-9.9zm0 15.4L21 21v-8.6h-9.9z"/></svg>`;
    case "apple":
      return `<svg class="dl-card__glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M16.7 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9-.7 0-1.9-.8-3.1-.8-1.6 0-3.1 1-3.9 2.5-1.7 2.9-.4 7.2 1.2 9.6.8 1.1 1.7 2.4 3 2.3 1.2 0 1.6-.8 3.1-.8s1.8.8 3.1.7c1.3 0 2.1-1.1 2.9-2.3.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.5-1-2.7-3.9zm-2.5-7.3c.6-.8 1.1-1.9.9-3-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-.9 2.9 1 .1 2-.5 2.7-1.3z"/></svg>`;
    case "console":
      return `<svg class="dl-card__glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4 5h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-5l-1.5 2.5h-3L9 17H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm2 3v2h2V8H6zm4 0v2h2V8h-2zm4 0v2h2V8h-2zm-8 4v2h3v-2H6zm5 0v2h7v-2h-7z"/></svg>`;
    case "performer":
      return `<svg class="dl-card__glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2a3.5 3.5 0 0 1 3.5 3.5v6a3.5 3.5 0 1 1-7 0v-6A3.5 3.5 0 0 1 12 2zm7 9.5a1 1 0 0 1 1 1 8 8 0 0 1-7 7.94V22h-2v-1.56A8 8 0 0 1 4 12.5a1 1 0 1 1 2 0 6 6 0 1 0 12 0 1 1 0 0 1 1-1z"/></svg>`;
  }
}
