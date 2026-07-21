import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  isDesktopShell,
  syncNavTimelineProjectId,
} from "../lib/desktopBridge.js";
import {
  getLastTimelineProjectId,
  setLastTimelineProjectId,
} from "../lib/lastTimelineProject.js";
import {
  buildShellModeNavItems,
  type ShellMode,
} from "./shellModeNavItems.js";
import styles from "./ShellModeNav.module.css";

export type { ShellMode };

type ShellModeNavProps = {
  active: ShellMode;
  timelineProjectId: string | null;
};

/**
 * Desktop-only top-level nav: Admin | Timeline | Klient.
 * Browser/Docker shells keep legacy appJump links.
 */
export function ShellModeNav({ active, timelineProjectId }: ShellModeNavProps) {
  const desktop = isDesktopShell();
  const resolvedTimelineId =
    timelineProjectId ?? (desktop ? getLastTimelineProjectId() : null);

  useEffect(() => {
    if (!desktop || !timelineProjectId) return;
    setLastTimelineProjectId(timelineProjectId);
    void syncNavTimelineProjectId(timelineProjectId);
  }, [desktop, timelineProjectId]);

  if (!desktop) return null;

  const items = buildShellModeNavItems(active, resolvedTimelineId);

  return (
    <nav className={styles.nav} aria-label="Widoki">
      {items.map((item) => {
        if (item.id === active) {
          return (
            <span key={item.id} className={styles.active} aria-current="page">
              {item.label}
            </span>
          );
        }
        if (!item.href) {
          return (
            <span
              key={item.id}
              className={styles.muted}
              aria-disabled
              title="Wybierz utwór w Admin"
            >
              {item.label}
            </span>
          );
        }
        return (
          <Link key={item.id} to={item.href}>
            {item.label}
          </Link>
        );
      })}
      {/* TODO(files): optional 4th slot when desktop file browser ships */}
    </nav>
  );
}
