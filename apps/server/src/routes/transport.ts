import { Router } from "express";
import {
  TransportLoadBodySchema,
  TransportLoopBodySchema,
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
  let mutationChain: Promise<void> = Promise.resolve();

  function withTransportLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = mutationChain.then(fn, fn);
    mutationChain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  router.get("/", (_req, res) => {
    try {
      res.json(transport.getState());
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.post("/play", async (req, res) => {
    try {
      const state = await withTransportLock(async () => {
        const body = TransportPlayBodySchema.parse(req.body ?? {});
        let project;
        const projectId =
          body.projectId ?? transport.getActiveProjectId() ?? undefined;
        if (projectId) {
          project = await stores.getProject(projectId);
        }
        return transport.play(body, project);
      });
      res.json(state);
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.post("/load", async (req, res) => {
    try {
      const state = await withTransportLock(async () => {
        const body = TransportLoadBodySchema.parse(req.body ?? {});
        const project = await stores.getProject(body.projectId);
        return transport.loadProject(body.projectId, project);
      });
      res.json(state);
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.post("/pause", async (_req, res) => {
    try {
      const state = await withTransportLock(async () => transport.pause());
      res.json(state);
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.post("/stop", async (_req, res) => {
    try {
      const state = await withTransportLock(async () => {
        let project;
        const activeId = transport.getActiveProjectId();
        if (activeId) {
          project = await stores.getProject(activeId);
        }
        return transport.stop(project);
      });
      res.json(state);
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.post("/seek", async (req, res) => {
    try {
      const state = await withTransportLock(async () => {
        const body = TransportSeekBodySchema.parse(req.body);
        let project;
        const activeId = transport.getActiveProjectId();
        if (activeId) {
          project = await stores.getProject(activeId);
        }
        return transport.seek(body.positionTicks, project);
      });
      res.json(state);
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.post("/loop", async (req, res) => {
    try {
      const state = await withTransportLock(async () => {
        const body = TransportLoopBodySchema.parse(req.body ?? {});
        return transport.setLoop(body);
      });
      res.json(state);
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  return router;
}
