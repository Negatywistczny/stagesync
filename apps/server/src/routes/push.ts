/**
 * Push token registration (#810).
 * Device self-registers FCM / WebPush endpoints — no Operator PIN.
 */

import { Router } from "express";
import {
  PushPublicConfigSchema,
  PushTokenRegisterBodySchema,
  PushTokenUnregisterBodySchema,
} from "@stagesync/shared";
import type { PushTokenStore } from "../push/tokens.js";
import { handleRouteError, sendError } from "./errors.js";

function readPublicConfig() {
  const vapid = process.env.STAGESYNC_VAPID_PUBLIC_KEY?.trim();
  const fcmAvailable =
    process.env.STAGESYNC_FCM_AVAILABLE === "1" ||
    Boolean(process.env.STAGESYNC_FCM_PROJECT_ID?.trim());
  return PushPublicConfigSchema.parse({
    ...(vapid ? { vapidPublicKey: vapid } : {}),
    fcmAvailable,
  });
}

export function createPushRouter(store: PushTokenStore): Router {
  const router = Router();

  router.get("/config", (_req, res) => {
    res.json(readPublicConfig());
  });

  router.post("/tokens", async (req, res) => {
    try {
      const body = PushTokenRegisterBodySchema.parse(req.body);
      const saved = await store.upsert(body);
      res.status(201).json({
        ok: true as const,
        token: saved.token,
        platform: saved.platform,
      });
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.delete("/tokens", async (req, res) => {
    try {
      const body = PushTokenUnregisterBodySchema.parse(req.body);
      const removed = await store.remove(body.token);
      if (!removed) {
        sendError(res, 404, "Token not found");
        return;
      }
      res.json({ ok: true as const });
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  return router;
}
