import { Router } from "express";
import {
  UgFetchBodySchema,
  UgSearchBodySchema,
} from "@stagesync/shared";
import { handleRouteError, sendError } from "./errors.js";
import { fetchUgTab, searchUgChords } from "../ug/ug-fetch.js";

function ugImportErrorStatus(err: unknown): number {
  const message = err instanceof Error ? err.message : String(err);
  if (/403|Cloudflare|limit czasu|pobierania|zablokował/i.test(message)) {
    return 502;
  }
  return 400;
}

export function createImportRouter(): Router {
  const router = Router();

  router.post("/ultimate-guitar", async (req, res) => {
    try {
      const body = UgFetchBodySchema.parse(req.body ?? {});
      const fetched = await fetchUgTab(body.url);
      res.json({
        content: fetched.content,
        metadata: fetched.metadata,
      });
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "name" in err &&
        (err as { name: string }).name === "ZodError"
      ) {
        handleRouteError(res, err);
        return;
      }
      sendError(
        res,
        ugImportErrorStatus(err),
        err instanceof Error ? err.message : "Import Ultimate Guitar nieudany",
      );
    }
  });

  router.post("/ultimate-guitar/search", async (req, res) => {
    try {
      const body = UgSearchBodySchema.parse(req.body ?? {});
      const results = await searchUgChords(body.title, body.artist);
      if (!results.length) {
        res.json({ results: [], message: "Brak wyników" });
        return;
      }
      res.json({ results });
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "name" in err &&
        (err as { name: string }).name === "ZodError"
      ) {
        handleRouteError(res, err);
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      if (/niedostępny/i.test(message)) {
        sendError(res, 500, message);
        return;
      }
      sendError(res, 502, message || "Wyszukiwanie Ultimate Guitar nieudane");
    }
  });

  return router;
}
