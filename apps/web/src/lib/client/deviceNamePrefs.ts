/**
 * Device display name for presence (`client_hello`) — shared across Client / Admin / Timeline.
 */

/** localStorage key — also seeded by Playwright e2e (`playwright.config.ts`). */
export const DEVICE_DISPLAY_NAME_STORAGE_KEY = "stagesync-device-display-name";
export const DEVICE_DISPLAY_NAME_MAX = 40;
export const DEVICE_DISPLAY_NAME_CHANGED_EVENT =
  "stagesync-device-display-name";

export function normalizeDeviceDisplayName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, DEVICE_DISPLAY_NAME_MAX);
}

export function getStoredDeviceDisplayName(): string | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const v = normalizeDeviceDisplayName(
      localStorage.getItem(DEVICE_DISPLAY_NAME_STORAGE_KEY) ?? "",
    );
    return v || null;
  } catch {
    return null;
  }
}

/** Persists a non-empty name; returns the stored value. */
export function setStoredDeviceDisplayName(raw: string): string {
  const name = normalizeDeviceDisplayName(raw);
  if (!name) {
    throw new Error("Nazwa nie może być pusta");
  }
  try {
    localStorage.setItem(DEVICE_DISPLAY_NAME_STORAGE_KEY, name);
  } catch {
    /* private mode / quota — still use in-memory via event */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(DEVICE_DISPLAY_NAME_CHANGED_EVENT, { detail: { name } }),
    );
  }
  return name;
}

export function clearStoredDeviceDisplayName(): void {
  try {
    localStorage.removeItem(DEVICE_DISPLAY_NAME_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(DEVICE_DISPLAY_NAME_CHANGED_EVENT, {
        detail: { name: null },
      }),
    );
  }
}
