import type { IncomingMessage, ServerResponse } from "node:http";
import { existsSync, renameSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const rootDir = dirname(fileURLToPath(import.meta.url));

type UiTarget = "full" | "performer" | "console";

function resolveUiTarget(mode: string): UiTarget {
  if (mode === "performer") return "performer";
  if (mode === "console") return "console";
  return "full";
}

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

function stagesyncUiMetaPlugin(target: UiTarget, distDir: string): Plugin {
  return {
    name: "stagesync-emit-ui-meta",
    apply: "build",
    async closeBundle() {
      // Role HTML entries are named client.html / console.html; Android expects index.html.
      if (target === "performer") {
        const from = join(distDir, "client.html");
        const to = join(distDir, "index.html");
        if (existsSync(from) && !existsSync(to)) renameSync(from, to);
      } else if (target === "console") {
        const from = join(distDir, "console.html");
        const to = join(distDir, "index.html");
        if (existsSync(from) && !existsSync(to)) renameSync(from, to);
      }

      const { emitUiMeta } = await import("./scripts/emit-ui-meta.mjs");
      const meta = emitUiMeta(distDir);
      console.log(
        `[stagesync] target=${target} uiHash=${meta.uiHash.slice(0, 12)}… protocol=${meta.protocolVersion}`,
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const target = resolveUiTarget(mode);
  const outDir =
    target === "performer"
      ? "dist-performer"
      : target === "console"
        ? "dist-console"
        : "dist";
  const distAbs = join(rootDir, outDir);
  const input =
    target === "performer"
      ? resolve(rootDir, "client.html")
      : target === "console"
        ? resolve(rootDir, "console.html")
        : resolve(rootDir, "index.html");

  return {
    define: {
      __STAGESYNC_UI_TARGET__: JSON.stringify(target),
    },
    plugins: [react(), stagesyncUiMetaPlugin(target, distAbs)],
    build: {
      outDir,
      emptyOutDir: true,
      manifest: target !== "full",
      rollupOptions: {
        input,
      },
    },
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
  };
});
