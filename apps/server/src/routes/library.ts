import { Router } from "express";
import type { Stores } from "../storage/index.js";
import { handleRouteError } from "./errors.js";

export function createLibraryRouter(stores: Stores): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    try {
      const library = await stores.getLibrary();
      res.json(library);
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  return router;
}
