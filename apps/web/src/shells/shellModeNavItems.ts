export type ShellMode = "admin" | "timeline" | "client";

export type ShellModeNavItem = {
  id: ShellMode;
  label: string;
  href: string | null;
};

/** Top-level desktop routes: Admin | Timeline | Klient. */
export function buildShellModeNavItems(
  active: ShellMode,
  timelineProjectId: string | null,
): ShellModeNavItem[] {
  const timelineHref = timelineProjectId
    ? `/timeline/${timelineProjectId}`
    : null;

  return [
    { id: "admin", label: "Admin", href: "/admin" },
    { id: "timeline", label: "Timeline", href: timelineHref },
    { id: "client", label: "Klient", href: "/client" },
  ].map((item) =>
    item.id === active ? { ...item, href: null } : item,
  ) as ShellModeNavItem[];
}
