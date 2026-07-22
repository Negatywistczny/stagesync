import { Router } from "express";
import {
  CreateProjectBodySchema,
  PutProjectBodySchema,
} from "@stagesync/shared";
import type { Stores } from "../storage/index.js";
import type { TransportEngine } from "../transport/engine.js";
import { createAssetsRouter } from "./assets.js";
import { handleRouteError } from "./errors.js";

export function createProjectsRouter(
  stores: Stores,
  transport?: TransportEngine,
): Router {
  const router = Router();

  router.post("/", async (req, res) => {
    try {
      const body = CreateProjectBodySchema.parse(req.body);
      const project = await stores.createProject(body.name, {
        fromTemplateId: body.fromTemplateId,
        isTemplate: body.isTemplate,
      });
      res.status(201).json(project);
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.use("/:id/assets", createAssetsRouter(stores));

  router.get("/:id", async (req, res) => {
    try {
      const project = await stores.getProject(req.params.id);
      res.json(project);
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.put("/:id", async (req, res) => {
    try {
      const body = PutProjectBodySchema.parse(req.body);
      const project = await stores.putProject(req.params.id, body);
      res.json(project);
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.delete("/:id", async (req, res) => {
    try {
      const id = req.params.id;
      await stores.deleteProject(id);
      transport?.clearActiveIf(id);
      res.status(204).send();
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  return router;
}
