import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button, Select } from "@stagesync/ui";
import { openPreferences } from "../../lib/preferencesEvents.js";
import {
  ADMIN_SECTIONS,
  getClientNavUrl,
  getTimelineNavUrl,
  OPERATOR_APP_SEGMENTS,
  type AdminSectionId,
  type OperatorAppId,
} from "../../lib/operatorNavRoutes.js";
import { markOperatorSession } from "../../lib/operatorSession.js";
import { shouldShowOperatorNav } from "../../lib/operatorSurface.js";
import { useOperatorNavShortcuts } from "../../lib/operatorNavShortcuts.js";
import { useMqMobileCompact } from "../../lib/useMqMobileCompact.js";
import { useMqTablet } from "../../lib/useMqTablet.js";
import { IconSettings } from "../icons.js";
import { ShellIconButton } from "../ShellIconButton.js";
import styles from "./OperatorNav.module.css";

export type OperatorNavProps = {
  activeApp: OperatorAppId;
  section?: AdminSectionId;
  onSectionChange?: (section: AdminSectionId) => void;
  onSettings?: () => void;
  settingsLabel?: string;
  /** Actions after settings (e.g. Admin restart / fullscreen). */
  trailing?: ReactNode;
  className?: string;
};

export function OperatorNav({
  activeApp,
  section = "songs",
  onSectionChange,
  onSettings,
  settingsLabel = "Ustawienia",
  trailing,
  className,
}: OperatorNavProps) {
  const { pathname } = useLocation();
  const isCompact = useMqMobileCompact();
  const isTablet = useMqTablet();
  const variant = isCompact ? "compact" : isTablet ? "tablet" : "wide";
  const show = shouldShowOperatorNav(pathname);

  useOperatorNavShortcuts({ enabled: show, pathname });

  if (!show) return null;

  const timelineUrl = getTimelineNavUrl();
  const timelineDisabled = timelineUrl === "/admin";
  const handleSettings =
    onSettings ??
    (() => openPreferences(activeApp === "admin" ? "general" : undefined));

  const rootClass = [
    styles.root,
    styles[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <nav className={rootClass} aria-label="Nawigacja operatora" data-ss-level="1">
      <div className={styles.segments} aria-label="Aplikacje">
        {OPERATOR_APP_SEGMENTS.map((seg) => {
          const selected = activeApp === seg.id;
          if (seg.id === "timeline" && timelineDisabled) {
            return (
              <span
                key={seg.id}
                className={styles.segmentMuted}
                aria-disabled
              >
                {seg.label}
              </span>
            );
          }

          const to =
            seg.id === "admin"
              ? "/admin"
              : seg.id === "timeline"
                ? timelineUrl
                : getClientNavUrl();

          if (selected) {
            return (
              <Button key={seg.id} variant="ghost" selected aria-current="page">
                {seg.label}
              </Button>
            );
          }

          return (
            <Link
              key={seg.id}
              to={to}
              className={styles.segmentLink}
              onClick={() => markOperatorSession()}
            >
              {seg.label}
            </Link>
          );
        })}
      </div>

      {activeApp === "admin" ? (
        <AdminSectionNav
          variant={variant}
          section={section}
          onSectionChange={onSectionChange}
        />
      ) : null}

      <div className={styles.aside}>
        <ShellIconButton label={settingsLabel} onClick={handleSettings}>
          <IconSettings />
        </ShellIconButton>
        {trailing}
      </div>
    </nav>
  );
}

type AdminSectionNavProps = {
  variant: "compact" | "tablet" | "wide";
  section: AdminSectionId;
  onSectionChange?: (section: AdminSectionId) => void;
};

function AdminSectionNav({
  variant,
  section,
  onSectionChange,
}: AdminSectionNavProps) {
  if (variant === "compact") {
    return (
      <div className={styles.sectionSelect}>
        <Select
          className={styles.sectionSelectInput}
          value={section}
          onChange={(e) => {
            const v = e.target.value as AdminSectionId;
            onSectionChange?.(v);
          }}
          aria-label="Sekcja Admin"
        >
          {ADMIN_SECTIONS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>
    );
  }

  return (
    <div className={styles.sections} aria-label="Sekcje Admin">
      {ADMIN_SECTIONS.map((item) => (
        <Button
          key={item.id}
          variant="ghost"
          selected={section === item.id}
          onClick={() => onSectionChange?.(item.id)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}
