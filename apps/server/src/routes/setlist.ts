import { Router } from "express";
import {
  PatchSetlistAutoAdvanceBodySchema,
  PutSetlistBodySchema,
  buildSetlistView,
} from "@stagesync/shared";
import type { Stores } from "../storage/index.js";
import type { TransportEngine } from "../transport/engine.js";
import { handleRouteError } from "./errors.js";

export function createSetlistRouter(
  stores: Stores,
  transport: TransportEngine,
): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    try {
      const [setlist, library] = await Promise.all([
        stores.getSetlist(),
        stores.getLibrary(),
      ]);
      res.json(
        buildSetlistView(setlist, library, transport.getActiveProjectId()),
      );
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.put("/", async (req, res) => {
    try {
      const body = PutSetlistBodySchema.parse(req.body);
      const setlist = await stores.putSetlist(body);
      const library = await stores.getLibrary();
      res.json(
        buildSetlistView(setlist, library, transport.getActiveProjectId()),
      );
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.patch("/auto-advance", async (req, res) => {
    try {
      const body = PatchSetlistAutoAdvanceBodySchema.parse(req.body);
      const setlist = await stores.patchSetlistAutoAdvance(body.enabled);
      const library = await stores.getLibrary();
      res.json(
        buildSetlistView(setlist, library, transport.getActiveProjectId()),
      );
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  return router;
}
