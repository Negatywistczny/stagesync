import type { IncomingMessage, ServerResponse } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function apiProxyError(
  err: Error,
  _req: IncomingMessage,
  res: ServerResponse | import("node:net").Socket,
): void {
  console.error(`[vite] /api proxy → :4000 failed: ${err.message}`);
  if ("writeHead" in res && !res.headersSent) {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: false,
        error:
          "API server unreachable on :4000 (is @stagesync/server still listening?)",
      }),
    );
  }
}

function stagesyncUiMetaPlugin(): Plugin {
  const distDir = join(dirname(fileURLToPath(import.meta.url)), "dist");
  return {
    name: "stagesync-emit-ui-meta",
    apply: "build",
    async closeBundle() {
      const { emitUiMeta } = await import("./scripts/emit-ui-meta.mjs");
      const meta = emitUiMeta(distDir);
      console.log(
        `[stagesync] uiHash=${meta.uiHash.slice(0, 12)}… protocol=${meta.protocolVersion}`,
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), stagesyncUiMetaPlugin()],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", apiProxyError);
        },
      },
      "/ws": { target: "ws://localhost:4000", ws: true },
    },
  },
});
