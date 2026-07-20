import express, { type Express } from "express";
import type { HealthResponse } from "@stagesync/shared";
import { createLibraryRouter } from "./routes/library.js";
import { createProjectsRouter } from "./routes/projects.js";
import { createSetlistRouter } from "./routes/setlist.js";
import { createStageRouter } from "./routes/stage.js";
import { createTransportRouter } from "./routes/transport.js";
import { createStores, type Stores } from "./storage/index.js";
import { defaultDataDir } from "./storage/paths.js";
import {
  createTransportEngine,
  type TransportEngine,
} from "./transport/engine.js";
import { createStageHub, type StageHub } from "./transport/stage-hub.js";

const VERSION = process.env.npm_package_version ?? "5.0.0-alpha.7";

export type CreateAppOptions = {
  /** Override data root (defaults to STAGESYNC_DATA_DIR or repo data/). */
  dataDir?: string;
  stores?: Stores;
  transport?: TransportEngine;
  stageHub?: StageHub;
};

export type AppBundle = {
  app: Express;
  transport: TransportEngine;
  stageHub: StageHub;
  stores: Stores;
};

export function createApp(options: CreateAppOptions = {}): AppBundle {
  const dataDir = options.dataDir ?? defaultDataDir();
  const stores = options.stores ?? createStores(dataDir);
  const transport = options.transport ?? createTransportEngine();
  const stageHub = options.stageHub ?? createStageHub();
  const app: Express = express();

  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    const body: HealthResponse = {
      ok: true,
      service: "stagesync-server",
      version: VERSION,
    };
    res.json(body);
  });

  app.use("/api/library", createLibraryRouter(stores));
  app.use("/api/projects", createProjectsRouter(stores));
  app.use("/api/setlist", createSetlistRouter(stores, transport));
  app.use("/api/stage", createStageRouter(stageHub));
  app.use("/api/transport", createTransportRouter(transport, stores));

  return { app, transport, stageHub, stores };
}
