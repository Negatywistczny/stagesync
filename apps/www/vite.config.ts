import { defineConfig } from "vite";

/** Project Pages live at /stagesync/; local / preview use `/`. */
const base = process.env.VITE_BASE ?? "/";

export default defineConfig({
  base,
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsInlineLimit: 0,
  },
  server: {
    port: 5173,
  },
});
