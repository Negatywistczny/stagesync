import { Router } from "express";
import {
  CreateProjectBodySchema,
  UpdateProjectBodySchema,
} from "@stagesync/shared";
import type { Stores } from "../storage/index.js";
import { handleRouteError, sendError } from "./errors.js";

export function createProjectsRouter(stores: Stores): Router {
  const router = Router();

  router.post("/", async (req, res) => {
    try {
      const body = CreateProjectBodySchema.parse(req.body);
      const project = await stores.createProject(body.name);
      res.status(201).json(project);
    } catch (err) {
      handleRouteError(res, err);
    }
  });

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
      const body = UpdateProjectBodySchema.parse(req.body);
      if (body.name === undefined) {
        sendError(res, 400, "At least one field is required (name)");
        return;
      }
      const project = await stores.updateProject(req.params.id, body);
      res.json(project);
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.delete("/:id", async (req, res) => {
    try {
      await stores.deleteProject(req.params.id);
      res.status(204).send();
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  return router;
}
