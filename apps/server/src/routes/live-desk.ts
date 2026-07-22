import { Router } from "express";
import { LiveDeskPatchBodySchema } from "@stagesync/shared";
import type { LiveDeskStore } from "../live-desk.js";
import { handleRouteError } from "./errors.js";

export function createLiveDeskRouter(liveDesk: LiveDeskStore): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    try {
      res.json(await liveDesk.get());
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.patch("/", async (req, res) => {
    try {
      const body = LiveDeskPatchBodySchema.parse(req.body);
      const next = await liveDesk.patch(body);
      res.json(next);
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  return router;
}
