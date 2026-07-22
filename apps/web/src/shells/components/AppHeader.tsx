import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { isDesktopShell } from "../../lib/desktopBridge.js";
import { openPreferences } from "../../lib/preferencesEvents.js";
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
  appJump: AppHeaderJumpLink[];
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
};

/**
 * Level 1 app chrome — Wordmark, shell jump, global actions.
 * By default hidden on desktop (`isDesktopShell`) where the OS menubar owns these actions.
 */
export function AppHeader({
  suffix,
  version,
  center,
  appJump,
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
}: AppHeaderProps) {
  if (hideOnDesktop && isDesktopShell()) return null;

  const handleSettings = onSettings ?? (() => openPreferences());

  return (
    <header className={styles.header} data-ss-level="1">
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
              label="Zapisz (⌘/Ctrl+S)"
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

        <ShellIconButton label={settingsLabel} onClick={handleSettings}>
          <IconSettings />
        </ShellIconButton>

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
