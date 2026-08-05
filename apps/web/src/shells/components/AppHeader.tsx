import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  getOperatorAppJumpLinks,
  type OperatorAppId,
} from "@lib/shell-operator/operatorNavRoutes.js";
import {
  isOsMenuDesktopShell,
  shouldShowOperatorNav,
} from "@lib/shell-operator/operatorSurface.js";
import { openPreferences } from "@lib/client/preferencesEvents.js";
import { useMqMobileCompact } from "@lib/client/useMqMobileCompact.js";
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
  /** When set, derives app-jump chips above compact mobile (OperatorNav stays in shell bar). */
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
   * When true (default), hide only chrome actions (gear, undo/redo, fullscreen, help, appearance)
   * on real Tauri OS-menu desktop. Shell wordmark + app jump nav stay visible (no platform exception).
   * Plain browser on `:4000` keeps the in-app gear (`isOsMenuDesktopShell` is false).
   */
  hideOnDesktop?: boolean;
  /**
   * Compact mobile: shell owns OperatorNav — omit L1 header (actions move to nav trailing).
   * Also skips duplicate safe-area padding on the hidden bar.
   */
  operatorNavExternal?: boolean;
};

export type AppHeaderActionsProps = Pick<
  AppHeaderProps,
  | "history"
  | "helpPressed"
  | "onHelp"
  | "appearancePressed"
  | "onAppearance"
  | "onFullscreen"
  | "connection"
  | "extraActions"
> & {
  /** Actions between Wygląd and Pełny ekran (e.g. Ustawienia in L1 header). */
  afterAppearance?: ReactNode;
};

/** Global chrome actions (history, help, appearance, fullscreen) without L1 wrapper. */
export function AppHeaderActions({
  history,
  helpPressed,
  onHelp,
  appearancePressed,
  onAppearance,
  onFullscreen,
  connection,
  extraActions,
  afterAppearance,
}: AppHeaderActionsProps) {
  return (
    <>
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

      {afterAppearance}

      {onFullscreen ? (
        <ShellIconButton label="Pełny ekran" onClick={onFullscreen}>
          <IconFullscreen />
        </ShellIconButton>
      ) : null}

      {connection}
      {extraActions}
    </>
  );
}

/**
 * Level 1 app chrome — Wordmark, shell jump, global actions.
 * When `hideOnDesktop` + Tauri OS-menu desktop, only skips chrome action buttons
 * (undo/redo/gear/fullscreen/help) — OS menubar owns them. Shell wordmark stays visible
 * (no platform exception vs browser / LAN operator).
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
  const operatorNavOnExternalBar = showOperatorNav && isCompactMobile;
  const resolvedAppJump =
    appJump.length > 0
      ? appJump
      : operatorApp && showOperatorNav && !isCompactMobile
        ? getOperatorAppJumpLinks(operatorApp)
        : [];
  const showAppJumpNav =
    resolvedAppJump.length > 0 &&
    (!showOperatorNav || !isCompactMobile);

  const isDesktopShell = hideOnDesktop && isOsMenuDesktopShell();
  if (operatorNavExternal && isCompactMobile) return null;

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
        {showAppJumpNav ? (
          <nav className={styles.appJump} aria-label="Aplikacje">
            {resolvedAppJump.map((link) =>
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

        {!isDesktopShell ? (
          <AppHeaderActions
            history={history}
            helpPressed={helpPressed}
            onHelp={onHelp}
            appearancePressed={appearancePressed}
            onAppearance={onAppearance}
            onFullscreen={onFullscreen}
            connection={connection}
            extraActions={extraActions}
            afterAppearance={
              !operatorNavOnExternalBar ? (
                <ShellIconButton label={settingsLabel} onClick={handleSettings}>
                  <IconSettings />
                </ShellIconButton>
              ) : null
            }
          />
        ) : null}
      </div>
    </header>
  );
}
