/// <reference types="vite/client" />

declare const __STAGESYNC_UI_TARGET__: "full" | "performer" | "console";

interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
