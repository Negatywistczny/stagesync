/**
 * Canonical layout breakpoints for StageSync web (v5.0.0).
 * Keep CSS `@media (max-width: …)` in sync with these values.
 *
 * - Mobile compact (phone chrome): OperatorNav, compact headers → ≤640px
 * - Mobile (content / touch): phone-only content layouts → ≤768px
 * - Tablet: 641–1024px — **desktop-like** app chrome (sections, app jump); not compact mobile
 * - Desktop: >1024px (default chrome; do not restyle outside media queries)
 */

export const BREAKPOINT_MOBILE_MAX_PX = 768;
export const BREAKPOINT_MOBILE_COMPACT_MAX_PX = 640;
export const BREAKPOINT_TABLET_MAX_PX = 1024;

export const MQ_MOBILE = `(max-width: ${BREAKPOINT_MOBILE_MAX_PX}px)`;
export const MQ_MOBILE_COMPACT = `(max-width: ${BREAKPOINT_MOBILE_COMPACT_MAX_PX}px)`;
export const MQ_TABLET = `(max-width: ${BREAKPOINT_TABLET_MAX_PX}px)`;
