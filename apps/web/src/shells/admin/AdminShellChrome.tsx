import { Link } from "react-router";
import { Button, Select } from "@stagesync/ui";
import {
  canReturnToLauncher,
  toggleAppFullscreen,
} from "@lib/client/desktopBridge.js";
import { APP_VERSION } from "@lib/client/appVersion.js";
import { openPreferences } from "@lib/client/preferencesEvents.js";
import { markOperatorSession } from "@lib/shell-operator/operatorSession.js";
import {
  getVisibleAdminSections,
  isAdminSectionId,
  type AdminSectionId,
} from "@lib/shell-operator/operatorNavRoutes.js";
import {
  shouldShowFullscreenControl,
  shouldShowOperatorNav,
} from "@lib/shell-operator/operatorSurface.js";
import { OperatorNav } from "../components/OperatorNav.js";
import {
  IconFullscreen,
  IconPower,
  IconRestart,
  IconSettings,
} from "../icons.js";
import { ShellIconButton } from "../ShellIconButton.js";
import { ShellWordmark } from "../ShellWordmark.js";
import type { useDoubleConfirm } from "./useDoubleConfirm.js";
import styles from "../AdminShell.module.css";

type DoubleConfirm = ReturnType<typeof useDoubleConfirm>;

type AdminShellChromeProps = {
  pathname: string;
  isCompactMobile: boolean;
  isTablet: boolean;
  section: AdminSectionId;
  onSectionChange: (section: AdminSectionId) => void;
  timelineProjectId: string | null;
  onNavigateHome: () => void;
  restart: DoubleConfirm;
  shutdown: DoubleConfirm;
};

export function AdminShellChrome({
  pathname,
  isCompactMobile,
  isTablet,
  section,
  onSectionChange,
  timelineProjectId,
  onNavigateHome,
  restart,
  shutdown,
}: AdminShellChromeProps) {
  const showOperatorNav = isCompactMobile && shouldShowOperatorNav(pathname);

  const fullscreenButton = shouldShowFullscreenControl() ? (
    <ShellIconButton
      label="Pełny ekran"
      onClick={() => void toggleAppFullscreen()}
    >
      <IconFullscreen />
    </ShellIconButton>
  ) : null;

  return (
    <div className={styles.chromeWrap}>
      <header
        className={[
          styles.chrome,
          isCompactMobile ? styles.chromeCompact : "",
          showOperatorNav ? styles.chromeOperatorNav : styles.chromeLegacy,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {!isCompactMobile ? (
          <div className={styles.chromeBrand}>
            <ShellWordmark
              suffix="Admin"
              version={APP_VERSION}
              iconOnly={isTablet}
              onClick={onNavigateHome}
              title={
                canReturnToLauncher() ? "Wróć do wyboru hosta" : "Strona główna"
              }
            />
          </div>
        ) : null}

        {showOperatorNav ? (
          <OperatorNav
            activeApp="admin"
            section={section}
            onSectionChange={onSectionChange}
            className={styles.operatorNavEmbed}
            trailing={fullscreenButton}
          />
        ) : (
          <>
            {isCompactMobile ? (
              <div className={styles.sectionSelect}>
                <Select
                  className={styles.sectionSelectInput}
                  value={section}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (isAdminSectionId(v)) {
                      onSectionChange(v);
                    }
                  }}
                  aria-label="Sekcja Admin"
                >
                  {getVisibleAdminSections().map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <nav className={styles.sections} aria-label="Sekcje">
                {getVisibleAdminSections().map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    selected={section === item.id}
                    onClick={() => onSectionChange(item.id)}
                  >
                    {item.label}
                  </Button>
                ))}
              </nav>
            )}

            <nav
              className={[
                styles.appJump,
                isCompactMobile ? styles.appJumpCompact : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-label="Aplikacje"
            >
              {timelineProjectId ? (
                <Link to={`/timeline/${timelineProjectId}`}>Timeline</Link>
              ) : (
                <span className={styles.appJumpMuted} aria-disabled>
                  Timeline
                </span>
              )}
              <Link to="/client" onClick={() => markOperatorSession()}>
                Klient
              </Link>
            </nav>

            <div className={styles.chromeAside}>
              <ShellIconButton
                label="Ustawienia"
                onClick={() => openPreferences("general")}
              >
                <IconSettings />
              </ShellIconButton>
              {!isCompactMobile ? (
                <>
                  <ShellIconButton
                    ref={restart.buttonRef}
                    label={restart.label}
                    confirming={restart.pending}
                    onClick={restart.arm}
                  >
                    <IconRestart />
                  </ShellIconButton>
                  <ShellIconButton
                    ref={shutdown.buttonRef}
                    label={shutdown.label}
                    confirming={shutdown.pending}
                    danger
                    onClick={shutdown.arm}
                  >
                    <IconPower />
                  </ShellIconButton>
                </>
              ) : null}
              {fullscreenButton}
            </div>
          </>
        )}
      </header>
    </div>
  );
}
