export type DevSurface = "tauri" | "console" | "performer" | "web";

export type DevPreviewRoute = "/admin" | "/client" | "/timeline";

export const DEV_PREVIEW_PROJECT_ID = "dev-preview";

export const DEV_VIEWPORTS = [
  { id: "phone", label: "375×667", width: 375, height: 667 },
  { id: "tablet", label: "768×1024", width: 768, height: 1024 },
  { id: "desktop", label: "1280×800", width: 1280, height: 800 },
] as const;
