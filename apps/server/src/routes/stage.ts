import { Router } from "express";
import { StageMessageBodySchema } from "@stagesync/shared";
import type { ClientPresence } from "../client-presence.js";
import type { StageHub } from "../transport/stage-hub.js";
import { handleRouteError } from "./errors.js";

export function createStageRouter(
  stageHub: StageHub,
  presence: ClientPresence,
): Router {
  const router = Router();

  router.post("/message", (req, res) => {
    try {
      const body = StageMessageBodySchema.parse(req.body);
      const msg = stageHub.broadcast({
        type: "stage_cue",
        text: body.text,
        roles: body.roles,
        ttlMs: body.ttlMs ?? 6000,
      });
      res.status(201).json(msg);
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.get("/clients", (_req, res) => {
    res.json({ clients: presence.list() });
  });

  return router;
}
