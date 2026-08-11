import {
  isAdminSectionId,
  type AdminSectionId,
} from "@lib/shell-operator/operatorNavRoutes.js";

export function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Operacja nie powiodła się";
}

export const ADMIN_LAST_SECTION_KEY = "stagesync:admin:last-section-v1";

export function readStoredAdminSection(): AdminSectionId {
  if (typeof window === "undefined") return "songs";
  try {
    const raw = window.localStorage.getItem(ADMIN_LAST_SECTION_KEY);
    if (raw && isAdminSectionId(raw)) return raw;
  } catch {
    /* storage unavailable (private mode etc.) */
  }
  return "songs";
}
