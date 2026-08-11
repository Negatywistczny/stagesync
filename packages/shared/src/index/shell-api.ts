/**
 * @stagesync/shared — Theme defaults and host discovery labels.
 *
 * Explicit named re-exports only (no `export *` from source modules).
 */

export {
  APPEARANCE_PROFILE_IDS,
  APPEARANCE_PROFILE_LABELS,
  APPEARANCE_PROFILE_SWATCHES,
  AppearanceProfileIdSchema,
  ThemeDefaultIdSchema,
  appearanceFromThemeDefault,
  normalizeAppearanceProfile,
  parseThemeDefaultEnv,
  type AppearanceProfileId,
  type ThemeAppearance,
  type ThemeDefaultId,
} from "../ui-helpers/theme-default.js";

export {
  formatDiscoveryMeta,
  formatDiscoveryTitle,
  formatDiscoveryVersionLabel,
  normalizeDiscoveryVersion,
  type FormatDiscoveryMetaInput,
  type FormatDiscoveryTitleInput,
} from "../project/host-discovery.js";
