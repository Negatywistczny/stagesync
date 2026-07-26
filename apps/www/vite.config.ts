import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));

/** Project Pages live at /stagesync/; local / preview use `/`. */
const base = process.env.VITE_BASE ?? "/";

export default defineConfig({
  base,
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: resolve(root, "index.html"),
        news: resolve(root, "aktualnosci/index.html"),
      },
    },
  },
  server: {
    port: 5173,
  },
});
