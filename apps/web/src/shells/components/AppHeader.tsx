import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { isDesktopShell } from "../../lib/desktopBridge.js";
import type { OperatorAppId } from "../../lib/operatorNavRoutes.js";
import { shouldShowOperatorNav } from "../../lib/operatorSurface.js";
import { openPreferences } from "../../lib/preferencesEvents.js";
import { useMqMobileCompact } from "../../lib/useMqMobileCompact.js";
import {
  IconDiscard,
  IconFullscreen,
  IconHelp,
  IconRedo,
  IconSave,
  IconSettings,
  IconSun,
  IconUndo,
} from "../icons.js";
import { ShellIconButton } from "../ShellIconButton.js";
import { ShellWordmark } from "../ShellWordmark.js";
import styles from "./AppHeader.module.css";

export type AppHeaderJumpLink = {
  to: string;
  label: string;
  /** When set, render muted disabled span instead of Link. */
  disabled?: boolean;
};

export type AppHeaderHistory = {
  canUndo: boolean;
  canRedo: boolean;
  dirty: boolean;
  savePending?: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onDiscard?: () => void;
};

export type AppHeaderProps = {
  suffix: string;
  version?: string;
  /** Optional center slot (rarely used — Admin tabs stay in L2). */
  center?: ReactNode;
  appJump?: AppHeaderJumpLink[];
  /** When set, compact mobile shells render OperatorNav externally — hide duplicate jumps/settings. */
  operatorApp?: OperatorAppId;
  history?: AppHeaderHistory;
  helpPressed?: boolean;
  onHelp?: () => void;
  appearancePressed?: boolean;
  onAppearance?: () => void;
  /** Defaults to opening Preferences modal. */
  onSettings?: () => void;
  settingsLabel?: string;
  onFullscreen?: () => void;
  connection?: ReactNode;
  /** Extra actions after defaults (e.g. shell-specific). */
  extraActions?: ReactNode;
  wordmarkOnClick?: () => void;
  wordmarkTitle?: string;
  /**
   * When true (default), hide on desktop — OS menubar owns these actions (Timeline).
   * Admin keeps Level 1 always visible (`hideOnDesktop={false}`).
   */
  hideOnDesktop?: boolean;
  /** Compact mobile: operator bar above handles notch inset — skip duplicate padding. */
  operatorNavExternal?: boolean;
};

/**
 * Level 1 app chrome — Wordmark, shell jump, global actions.
 * By default hidden on desktop (`isDesktopShell`) where the OS menubar owns these actions.
 */
export function AppHeader({
  suffix,
  version,
  center,
  appJump = [],
  operatorApp,
  history,
  helpPressed,
  onHelp,
  appearancePressed,
  onAppearance,
  onSettings,
  settingsLabel = "Ustawienia",
  onFullscreen,
  connection,
  extraActions,
  wordmarkOnClick,
  wordmarkTitle,
  hideOnDesktop = true,
  operatorNavExternal = false,
}: AppHeaderProps) {
  const { pathname } = useLocation();
  const isCompactMobile = useMqMobileCompact();
  const showOperatorNav = operatorApp
    ? shouldShowOperatorNav(pathname)
    : false;
  const compactOperatorNav = showOperatorNav && isCompactMobile;

  if (hideOnDesktop && isDesktopShell()) return null;

  const handleSettings = onSettings ?? (() => openPreferences());

  return (
    <header
      className={[
        styles.header,
        operatorNavExternal ? styles.compactStacked : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-ss-level="1"
    >
      <div className={styles.brand}>
        <ShellWordmark
          suffix={suffix}
          version={version}
          onClick={wordmarkOnClick}
          title={wordmarkTitle}
        />
      </div>

      {center ? <div className={styles.center}>{center}</div> : null}

      <div className={styles.actions}>
        {compactOperatorNav ? null : appJump.length > 0 ? (
          <nav className={styles.appJump} aria-label="Aplikacje">
            {appJump.map((link) =>
              link.disabled ? (
                <span
                  key={link.label}
                  className={styles.appJumpMuted}
                  aria-disabled
                >
                  {link.label}
                </span>
              ) : (
                <Link key={link.to} to={link.to}>
                  {link.label}
                </Link>
              ),
            )}
          </nav>
        ) : null}

        {history ? (
          <>
            <ShellIconButton
              label="Cofnij"
              disabled={!history.canUndo}
              onClick={history.onUndo}
            >
              <IconUndo />
            </ShellIconButton>
            <ShellIconButton
              label="Ponów"
              disabled={!history.canRedo}
              onClick={history.onRedo}
            >
              <IconRedo />
            </ShellIconButton>
            {history.onDiscard ? (
              <ShellIconButton
                label="Odrzuć zmiany"
                className={
                  history.dirty && !history.savePending
                    ? styles.historyDiscardHot
                    : undefined
                }
                disabled={!history.dirty || Boolean(history.savePending)}
                onClick={history.onDiscard}
              >
                <IconDiscard />
              </ShellIconButton>
            ) : null}
            <ShellIconButton
              label="Zapisz"
              aria-keyshortcuts="Meta+S Control+S"
              pressed={history.dirty && !history.savePending}
              className={
                history.dirty && !history.savePending
                  ? styles.historySaveHot
                  : undefined
              }
              disabled={!history.dirty || Boolean(history.savePending)}
              onClick={history.onSave}
            >
              <IconSave />
            </ShellIconButton>
          </>
        ) : null}

        {onHelp ? (
          <ShellIconButton
            label="Pomoc"
            aria-keyshortcuts="Shift+/"
            pressed={helpPressed}
            onClick={onHelp}
          >
            <IconHelp />
          </ShellIconButton>
        ) : null}

        {onAppearance ? (
          <ShellIconButton
            label="Wygląd"
            pressed={appearancePressed}
            onClick={onAppearance}
          >
            <IconSun />
          </ShellIconButton>
        ) : null}

        {!compactOperatorNav ? (
          <ShellIconButton label={settingsLabel} onClick={handleSettings}>
            <IconSettings />
          </ShellIconButton>
        ) : null}

        {onFullscreen ? (
          <ShellIconButton label="Pełny ekran" onClick={onFullscreen}>
            <IconFullscreen />
          </ShellIconButton>
        ) : null}

        {connection}
        {extraActions}
      </div>
    </header>
  );
}
