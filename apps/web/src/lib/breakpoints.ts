/**
 * Canonical layout breakpoints for StageSync web (v5.0.0).
 * Keep CSS `@media (max-width: …)` in sync with these values.
 *
 * - Mobile: phones (portrait + landscape) → ≤768px
 * - Tablet: tablets in portrait / narrow windows → ≤1024px
 * - Desktop: wider than 1024px (default chrome; do not restyle outside media queries)
 */

export const BREAKPOINT_MOBILE_MAX_PX = 768;
export const BREAKPOINT_TABLET_MAX_PX = 1024;

export const MQ_MOBILE = `(max-width: ${BREAKPOINT_MOBILE_MAX_PX}px)`;
export const MQ_TABLET = `(max-width: ${BREAKPOINT_TABLET_MAX_PX}px)`;
