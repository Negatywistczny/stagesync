import express from "express";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LibrarySchema, type HealthResponse } from "@stagesync/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../../..");
const PORT = Number(process.env.PORT ?? 4000);
const VERSION = process.env.npm_package_version ?? "5.0.0-alpha.1";

const app = express();
app.use(express.json());

app.get("/api/health", (_req, res) => {
  const body: HealthResponse = {
    ok: true,
    service: "stagesync-server",
    version: VERSION,
  };
  res.json(body);
});

/** Stub: load library catalog template from data/ (validated with Zod). */
app.get("/api/library", (_req, res) => {
  const templatePath = join(ROOT, "data/library/library.template.json");
  try {
    const raw = JSON.parse(readFileSync(templatePath, "utf8"));
    const library = LibrarySchema.parse(raw);
    res.json(library);
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Failed to load library",
    });
  }
});

app.listen(PORT, () => {
  console.log(`[stagesync-server] listening on http://localhost:${PORT}`);
});
