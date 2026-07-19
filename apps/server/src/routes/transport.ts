import { Router } from "express";
import {
  TransportPlayBodySchema,
  TransportSeekBodySchema,
} from "@stagesync/shared";
import type { TransportEngine } from "../transport/engine.js";
import { handleRouteError } from "./errors.js";

export function createTransportRouter(transport: TransportEngine): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    try {
      res.json(transport.getState());
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.post("/play", (req, res) => {
    try {
      const body = TransportPlayBodySchema.parse(req.body ?? {});
      res.json(transport.play(body));
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

  router.post("/seek", (req, res) => {
    try {
      const body = TransportSeekBodySchema.parse(req.body);
      res.json(transport.seek(body.positionTicks));
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  return router;
}
