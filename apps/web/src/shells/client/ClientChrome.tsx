import React from "react";
import { Link } from "react-router";
import type { WsStatus } from "../../transport/transportContext.js";
import { getOperatorAppJumpLinks } from "@lib/shell-operator/operatorNavRoutes.js";
import { markOperatorSession } from "@lib/shell-operator/operatorSession.js";
import { ConnectionIndicator } from "./ConnectionIndicator.js";
import { IconFullscreen, IconSettings } from "../components/icons.js";
import {
  SettingsPopover,
  SettingsPopoverAnchor,
} from "../settings/SettingsPopover.js";
import { ShellIconButton } from "../components/ShellIconButton.js";
import { ShellWordmark } from "../components/ShellWordmark.js";
import type { ClientDisplayPrefs } from "@lib/client/clientDisplayPrefs.js";
import { GlobalSettingsFields } from "./ClientSettingsFields.js";
import styles from "./ClientShell.module.css";

export type ClientHeaderProps = {
  wsStatus: WsStatus;
  latencyMs: number | null;
  started: boolean;
  songTitle: string;
  bbt: { bar: number; beat: number };
  transportError: string | null;
  compact?: boolean;
  /** Tablet/desktop operator jump chips (Admin / Timeline). */
  showAppJump?: boolean;
  /** Compact OperatorNav owns settings — hide duplicate gear in Client chrome. */
  hideGlobalSettings?: boolean;
  onFullscreen?: () => void;
  globalSettingsOpen: boolean;
  onToggleGlobalSettings: () => void;
  onCloseGlobalSettings: () => void;
  onBack?: () => void;
  displayPrefs: ClientDisplayPrefs;
  onDisplayPrefsChange: (prefs: ClientDisplayPrefs) => void;
};

export function ClientChrome({
  wsStatus,
  latencyMs,
  started,
  songTitle,
  bbt,
  transportError,
  compact = false,
  showAppJump = false,
  hideGlobalSettings = false,
  onFullscreen,
  globalSettingsOpen,
  onToggleGlobalSettings,
  onCloseGlobalSettings,
  onBack,
  displayPrefs,
  onDisplayPrefsChange,
}: ClientHeaderProps) {
  const appJump = showAppJump ? getOperatorAppJumpLinks("client") : [];

  return (
    <header
      className={[styles.header, compact ? styles.headerCompact : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <ShellWordmark
        iconOnly={compact}
        onClick={started && onBack ? onBack : undefined}
        title={started && onBack ? "Powrót do wyboru ról" : undefined}
      />

      {!compact ? (
        <div className={styles.metronome} aria-hidden>
          {[1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={[
                styles.dot,
                wsStatus !== "disconnected" && i === bbt.beat
                  ? styles.dotActive
                  : "",
              ].join(" ")}
            />
          ))}
        </div>
      ) : null}

      <strong className={styles.songTitle}>{songTitle}</strong>

      {transportError && !compact ? (
        <span className={styles.transportError} role="alert">
          {transportError}
        </span>
      ) : null}

      <div className={styles.headerActions}>
        {appJump.length > 0 ? (
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
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => markOperatorSession()}
                >
                  {link.label}
                </Link>
              ),
            )}
          </nav>
        ) : null}
        <ConnectionIndicator
          status={wsStatus}
          latencyMs={latencyMs}
          variant={compact ? "compact" : "status"}
        />
        {!hideGlobalSettings ? (
          <SettingsPopoverAnchor>
            <ShellIconButton
              label="Ustawienia globalne"
              aria-expanded={globalSettingsOpen}
              aria-controls="global-settings-panel"
              onClick={onToggleGlobalSettings}
            >
              <IconSettings />
            </ShellIconButton>
            {globalSettingsOpen ? (
              <SettingsPopover
                id="global-settings-panel"
                title="Ustawienia globalne"
                onClose={onCloseGlobalSettings}
              >
                <GlobalSettingsFields
                  prefs={displayPrefs}
                  onPrefsChange={onDisplayPrefsChange}
                />
              </SettingsPopover>
            ) : null}
          </SettingsPopoverAnchor>
        ) : null}
        {globalSettingsOpen && hideGlobalSettings ? (
          <SettingsPopover
            id="global-settings-panel"
            title="Ustawienia globalne"
            placement="fixed-top-right"
            onClose={onCloseGlobalSettings}
          >
            <GlobalSettingsFields
              prefs={displayPrefs}
              onPrefsChange={onDisplayPrefsChange}
            />
          </SettingsPopover>
        ) : null}
        {onFullscreen ? (
          <ShellIconButton label="Pełny ekran" onClick={onFullscreen}>
            <IconFullscreen />
          </ShellIconButton>
        ) : null}
      </div>
    </header>
  );
}
