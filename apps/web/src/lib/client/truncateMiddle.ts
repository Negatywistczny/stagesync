/**
 * Middle-ellipsis truncation for tight dock labels (e.g. "Backing Vox 1" → "Backing…Vox 1").
 * Pure: caller supplies width + measure (canvas / monospace stub in tests).
 */

export const MIDDLE_ELLIPSIS = "…";

/**
 * Fit `text` into `maxWidth` by removing a middle run and inserting an ellipsis.
 * Prefers keeping a slightly longer prefix (track names often end with a short index).
 */
export function truncateMiddle(
  text: string,
  maxWidth: number,
  measure: (s: string) => number,
  ellipsis: string = MIDDLE_ELLIPSIS,
): string {
  if (!text) return text;
  if (!(maxWidth > 0)) return "";
  if (measure(text) <= maxWidth) return text;

  const ellipsisWidth = measure(ellipsis);
  if (ellipsisWidth >= maxWidth) return ellipsis;

  let best = ellipsis;
  let lo = 0;
  let hi = text.length;

  while (lo <= hi) {
    const kept = (lo + hi) >> 1;
    if (kept <= 0) {
      lo = kept + 1;
      continue;
    }
    // Prefer prefix: ceil/floor so "Backing Vox 1" → "Backing…Vox 1".
    const startLen = Math.ceil(kept / 2);
    const endLen = kept - startLen;
    const candidate =
      text.slice(0, startLen) + ellipsis + text.slice(text.length - endLen);
    if (measure(candidate) <= maxWidth) {
      best = candidate;
      lo = kept + 1;
    } else {
      hi = kept - 1;
    }
  }

  return best;
}

/** Canvas `measureText` bound to a CSS font string (browser only). */
export function createCanvasTextMeasurer(
  font: string,
): (s: string) => number {
  if (typeof document === "undefined") {
    return (s) => s.length;
  }
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return (s) => s.length * 7;
  }
  ctx.font = font;
  return (s) => ctx.measureText(s).width;
}

/** Build a canvas measurer from an element's computed font. */
export function measurerFromElement(el: Element): (s: string) => number {
  const style = getComputedStyle(el);
  const font =
    style.font && style.font !== ""
      ? style.font
      : `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  return createCanvasTextMeasurer(font);
}
