/**
 * Timeline touch tiers — port of v4 `timeline-touch.js` detect logic (not HTML clone).
 * mobile ≤640px → RO player chrome; tablet ≤1024px or coarse pointer; else desktop.
 * Tauri desktop never enters mobile player — OS menu is L1 SSOT; narrow window stays editable.
 */

import { MQ_MOBILE_COMPACT, MQ_TABLET } from "./breakpoints.js";
import { shouldUseMobileCompactChrome } from "./operatorSurface.js";

export type TimelineTouchTier = "desktop" | "tablet" | "mobile";

export const TIMELINE_MOBILE_MQ = MQ_MOBILE_COMPACT;
export const TIMELINE_TABLET_MQ = MQ_TABLET;
export const TIMELINE_COARSE_MQ = "(pointer: coarse)";

export type DetectTimelineTierOptions = {
  /** Override phone player gate (default: `shouldUseMobileCompactChrome()`). */
  allowMobilePlayer?: boolean;
};

export function detectTimelineTier(
  matches: (query: string) => boolean = (q) =>
    typeof window !== "undefined" ? window.matchMedia(q).matches : false,
  options?: DetectTimelineTierOptions,
): TimelineTouchTier {
  const allowMobilePlayer =
    options?.allowMobilePlayer ?? shouldUseMobileCompactChrome();
  if (matches(TIMELINE_MOBILE_MQ) && allowMobilePlayer) return "mobile";
  if (matches(TIMELINE_TABLET_MQ) || matches(TIMELINE_COARSE_MQ)) return "tablet";
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
