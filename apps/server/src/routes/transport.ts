import { Router } from "express";
import {
  TransportLoadBodySchema,
  TransportPlayBodySchema,
  TransportSeekBodySchema,
} from "@stagesync/shared";
import type { Stores } from "../storage/index.js";
import type { TransportEngine } from "../transport/engine.js";
import { handleRouteError } from "./errors.js";

export function createTransportRouter(
  transport: TransportEngine,
  stores: Stores,
): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    try {
      res.json(transport.getState());
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
      res.json(transport.play(body, project));
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.post("/load", async (req, res) => {
    try {
      const body = TransportLoadBodySchema.parse(req.body ?? {});
      const project = await stores.getProject(body.projectId);
      res.json(transport.loadProject(body.projectId, project));
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.post("/pause", (_req, res) => {
    try {
      res.json(transport.pause());
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
      res.json(transport.seek(body.positionTicks, project));
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  return router;
}
