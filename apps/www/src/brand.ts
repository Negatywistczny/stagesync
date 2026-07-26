/** Official StageSync wordmark: Stage = text, Sync = amber. */

export const BRAND_HTML =
  '<span class="brand-name"><span class="brand-name__stage">Stage</span><span class="brand-name__sync">Sync</span></span>';

/** Escape text, then color every plain "StageSync" as the official wordmark. */
export function htmlWithBrandWordmarks(text: string): string {
  const escaped = text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
  return escaped.replaceAll("StageSync", BRAND_HTML);
}

/** Fill an element with text that may contain StageSync wordmarks. */
export function setTextWithBrand(el: HTMLElement, text: string): void {
  el.innerHTML = htmlWithBrandWordmarks(text);
}
