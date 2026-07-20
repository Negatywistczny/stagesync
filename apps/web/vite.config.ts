import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig } from "vite";
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

export default defineConfig({
  plugins: [react()],
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
