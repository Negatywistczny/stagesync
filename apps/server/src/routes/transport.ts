import { Router } from "express";
import {
  TransportLoadBodySchema,
  TransportLoopBodySchema,
  TransportPlayBodySchema,
  TransportSeekBodySchema,
} from "@stagesync/shared";
import type { Stores } from "../storage/index.js";
import type { TransportEngine } from "../transport/engine.js";
import { handleRouteError } from "./errors.js";

/** REST responses include serverTimeMs (same clock as WS ticks) for soft-clock ordering. */
function respondTick(res: import("express").Response, transport: TransportEngine) {
  res.json(transport.toTickMessage());
}

export function createTransportRouter(
  transport: TransportEngine,
  stores: Stores,
): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    try {
      respondTick(res, transport);
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.post("/play", async (req, res) => {
    try {
      const body = TransportPlayBodySchema.parse(req.body ?? {});
      let project;
      const projectId =
        body.projectId ?? transport.getActiveProjectId() ?? undefined;
      if (projectId) {
        project = await stores.getProject(projectId);
      }
      transport.play(body, project);
      respondTick(res, transport);
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.post("/load", async (req, res) => {
    try {
      const body = TransportLoadBodySchema.parse(req.body ?? {});
      const project = await stores.getProject(body.projectId);
      transport.loadProject(body.projectId, project);
      respondTick(res, transport);
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.post("/pause", (_req, res) => {
    try {
      transport.pause();
      respondTick(res, transport);
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.post("/stop", async (_req, res) => {
    try {
      let project;
      const activeId = transport.getActiveProjectId();
      if (activeId) {
        project = await stores.getProject(activeId);
      }
      transport.stop(project);
      respondTick(res, transport);
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.post("/seek", async (req, res) => {
    try {
      const body = TransportSeekBodySchema.parse(req.body);
      let project;
      const activeId = transport.getActiveProjectId();
      if (activeId) {
        project = await stores.getProject(activeId);
      }
      transport.seek(body.positionTicks, project);
      respondTick(res, transport);
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.post("/loop", (req, res) => {
    try {
      const body = TransportLoopBodySchema.parse(req.body ?? {});
      transport.setLoop(body);
      respondTick(res, transport);
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  return router;
}
