import { Router } from "express";
import { StageMessageBodySchema } from "@stagesync/shared";
import type { ClientPresence } from "../client-presence.js";
import type { StageHub } from "../transport/stage-hub.js";
import { handleRouteError, sendError } from "./errors.js";

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
        priority: body.priority,
      });
      res.status(201).json({ ...msg, messages: stageHub.list() });
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.get("/messages", (_req, res) => {
    res.json({ messages: stageHub.list() });
  });

  router.delete("/messages", (_req, res) => {
    stageHub.clearAll();
    res.json({ ok: true, messages: [] });
  });

  router.delete("/messages/:id", (req, res) => {
    const id = String(req.params.id ?? "");
    if (!stageHub.dismiss(id)) {
      sendError(res, 404, "Message not found");
      return;
    }
    res.json({ ok: true, messages: stageHub.list() });
  });

  router.get("/clients", (_req, res) => {
    res.json({ clients: presence.list() });
  });

  return router;
}
