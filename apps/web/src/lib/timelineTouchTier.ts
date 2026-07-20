/**
 * Timeline touch tiers — port of v4 `timeline-touch.js` detect logic (not HTML clone).
 * mobile ≤767px → RO canvas; tablet = coarse pointer; else desktop.
 */

export type TimelineTouchTier = "desktop" | "tablet" | "mobile";

export const TIMELINE_MOBILE_MQ = "(max-width: 767px)";
export const TIMELINE_COARSE_MQ = "(pointer: coarse)";

export function detectTimelineTier(
  matches: (query: string) => boolean = (q) =>
    typeof window !== "undefined" ? window.matchMedia(q).matches : false,
): TimelineTouchTier {
  if (matches(TIMELINE_MOBILE_MQ)) return "mobile";
  if (matches(TIMELINE_COARSE_MQ)) return "tablet";
  return "desktop";
}

export function isTouchTier(tier: TimelineTouchTier): boolean {
  return tier === "tablet" || tier === "mobile";
}

export function isMobileTier(tier: TimelineTouchTier): boolean {
  return tier === "mobile";
}

/** Mobile = content RO; tablet = no free drag (nudge / select); desktop = full. */
export function timelineGesturesAllowed(tier: TimelineTouchTier): {
  pencilDraw: boolean;
  clipDragResize: boolean;
  mapEdit: boolean;
} {
  if (tier === "mobile") {
    return { pencilDraw: false, clipDragResize: false, mapEdit: false };
  }
  if (tier === "tablet") {
    return { pencilDraw: true, clipDragResize: false, mapEdit: true };
  }
  return { pencilDraw: true, clipDragResize: true, mapEdit: true };
}

export const TOUCH_FULL_EDIT_MSG =
  "Użyj tabletu lub komputera do pełnej edycji";
