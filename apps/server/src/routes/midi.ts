import { Router } from "express";
import {
  MidiHostStatusSchema,
  PutMidiHostConfigBodySchema,
} from "@stagesync/shared";
import type { MidiHost } from "../midi/host.js";
import { handleRouteError } from "./errors.js";

export function createMidiRouter(midi: MidiHost): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    try {
      res.set("Cache-Control", "no-store");
      res.json(MidiHostStatusSchema.parse(midi.getStatus()));
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.get("/devices", (_req, res) => {
    try {
      res.set("Cache-Control", "no-store");
      const status = midi.getStatus();
      res.json({
        available: status.available,
        backend: status.backend,
        inputs: status.inputs,
        outputs: status.outputs,
        lastError: status.lastError,
      });
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.put("/config", (req, res) => {
    try {
      const body = PutMidiHostConfigBodySchema.parse(req.body ?? {});
      midi.setConfig(body);
      res.json(MidiHostStatusSchema.parse(midi.getStatus()));
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  return router;
}
