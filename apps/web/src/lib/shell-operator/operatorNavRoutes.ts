import { getLastTimelineProjectId } from "@lib/client/lastTimelineProject.js";

export type AdminSectionId = "songs" | "set" | "stage" | "host";

export const ADMIN_SECTIONS: readonly {
  id: AdminSectionId;
  label: string;
}[] = [
  { id: "songs", label: "Utwory" },
  { id: "set", label: "Set" },
  { id: "stage", label: "Scena" },
  { id: "host", label: "Host" },
] as const;

export const ADMIN_SECTION_IDS = new Set<AdminSectionId>(
  ADMIN_SECTIONS.map((s) => s.id),
);

export function isAdminSectionId(value: string): value is AdminSectionId {
  return ADMIN_SECTION_IDS.has(value as AdminSectionId);
}

/** Mirrors Tauri `timeline_nav_url` — last project or Admin fallback. */
export function getTimelineNavUrl(): string {
  const id = getLastTimelineProjectId();
  return id ? `/timeline/${id}` : "/admin";
}

export function getAdminNavUrl(section?: AdminSectionId): string {
  if (section) return `/admin?section=${section}`;
  return "/admin";
}

export function getClientNavUrl(): string {
  return "/client";
}

export type OperatorAppId = "admin" | "timeline" | "client";

export const OPERATOR_APP_SEGMENTS: readonly {
  id: OperatorAppId;
  label: string;
}[] = [
  { id: "admin", label: "Admin" },
  { id: "timeline", label: "Timeline" },
  { id: "client", label: "Klient" },
] as const;

export type OperatorAppJumpLink = {
  to: string;
  label: string;
  disabled?: boolean;
};

/** Legacy app-jump chips for operator surfaces above compact mobile (Timeline AppHeader). */
export function getOperatorAppJumpLinks(
  activeApp: OperatorAppId,
): OperatorAppJumpLink[] {
  const timelineUrl = getTimelineNavUrl();
  const timelineDisabled = timelineUrl === "/admin";
  switch (activeApp) {
    case "admin":
      return [
        { to: timelineUrl, label: "Timeline", disabled: timelineDisabled },
        { to: getClientNavUrl(), label: "Klient" },
      ];
    case "timeline":
      return [
        { to: getAdminNavUrl(), label: "Admin" },
        { to: getClientNavUrl(), label: "Klient" },
      ];
    case "client":
      return [
        { to: getAdminNavUrl(), label: "Admin" },
        { to: timelineUrl, label: "Timeline", disabled: timelineDisabled },
      ];
  }
}
