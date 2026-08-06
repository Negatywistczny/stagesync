import { Router } from "express";
import {
  UgFetchBodySchema,
  UgSearchBodySchema,
  UltrastarAccountPutBodySchema,
  UltrastarAccountTestBodySchema,
  UltrastarFetchBodySchema,
  UltrastarSearchBodySchema,
} from "@stagesync/shared";
import { writeManagedSettings } from "../env-settings.js";
import { handleRouteError, sendError } from "./errors.js";
import { mountSessionYoutubeRoutes } from "./youtube-audio.js";
import { fetchUgTab, searchUgChords } from "../ug/ug-fetch.js";
import {
  clearUsdbSessionCache,
  fetchUsdbSong,
  loginUsdb,
  readUsdbCredentialsFromEnv,
  searchUsdbSongs,
  UsdbAuthError,
  type UsdbCredentials,
} from "../usdb/usdb-fetch.js";

function ugImportErrorStatus(err: unknown): number {
  const message = err instanceof Error ? err.message : String(err);
  if (/403|Cloudflare|limit czasu|pobierania|zablokował/i.test(message)) {
    return 502;
  }
  return 400;
}

function ultrastarImportErrorStatus(err: unknown): number {
  if (err instanceof UsdbAuthError) {
    if (err.code === "invalid_credentials") return 401;
    if (err.code === "rate_limited") return 429;
    return 502;
  }
  const message = err instanceof Error ? err.message : String(err);
  if (/Brak konta USDB|Konto USDB|STAGESYNC_USDB_/i.test(message)) {
    return 503;
  }
  if (
    /limit czasu|sesj[aiy] USDB|zaloguj|odnowić sesji|niedostęp|nie udało się połączyć/i.test(
      message,
    )
  ) {
    return 502;
  }
  if (/Nieprawidłowe dane logowania|ogranicza logowanie/i.test(message)) {
    return /ogranicza logowanie/i.test(message) ? 429 : 401;
  }
  return 400;
}

function isZodError(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "name" in err &&
    (err as { name: string }).name === "ZodError"
  );
}

function usdbAccountStatus(env: NodeJS.ProcessEnv = process.env): {
  configured: boolean;
  user: string;
} {
  const creds = readUsdbCredentialsFromEnv(env);
  return {
    configured: creds != null,
    user: creds?.user ?? "",
  };
}

function persistUsdbAccount(user: string, pass: string | undefined): {
  configured: boolean;
  user: string;
} {
  const trimmedUser = user.trim();
  if (!trimmedUser) {
    writeManagedSettings({
      STAGESYNC_USDB_USER: "",
      STAGESYNC_USDB_PASS: null,
    });
    clearUsdbSessionCache();
    return { configured: false, user: "" };
  }

  const existing = readUsdbCredentialsFromEnv();
  const nextPass = pass?.trim() ?? "";
  if (!nextPass && !existing?.pass) {
    throw new Error("Podaj hasło konta USDB.");
  }

  writeManagedSettings({
    STAGESYNC_USDB_USER: trimmedUser,
    ...(nextPass ? { STAGESYNC_USDB_PASS: nextPass } : {}),
  });
  clearUsdbSessionCache();
  return usdbAccountStatus();
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
      if (isZodError(err)) {
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
      if (isZodError(err)) {
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

  router.get("/ultrastar/account", (_req, res) => {
    try {
      res.set("Cache-Control", "no-store");
      res.json(usdbAccountStatus());
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.put("/ultrastar/account", (req, res) => {
    try {
      const body = UltrastarAccountPutBodySchema.parse(req.body ?? {});
      const status = persistUsdbAccount(body.user, body.pass);
      res.json({
        ok: true as const,
        ...status,
        message: status.configured
          ? "Zapisano konto USDB na hoście."
          : "Usunięto konto USDB z hosta.",
      });
    } catch (err) {
      if (isZodError(err)) {
        handleRouteError(res, err);
        return;
      }
      sendError(
        res,
        400,
        err instanceof Error ? err.message : "Zapis konta USDB nieudany",
      );
    }
  });

  // codeql[js/missing-rate-limiting]
  router.post("/ultrastar/account/test", async (req, res) => {
    try {
      const body = UltrastarAccountTestBodySchema.parse(req.body ?? {});
      const stored = readUsdbCredentialsFromEnv();
      const user = body.user?.trim() || stored?.user || "";
      const pass = body.pass?.trim() || stored?.pass || "";
      if (!user || !pass) {
        sendError(
          res,
          503,
          "Brak konta USDB. Ustaw je w Import UltraStar → Konto USDB albo w Ustawieniach serwera.",
        );
        return;
      }
      const creds: UsdbCredentials = { user, pass };
      await loginUsdb(creds);
      res.json({
        ok: true as const,
        message: "Połączenie z USDB OK — dane logowania działają.",
      });
    } catch (err) {
      if (isZodError(err)) {
        handleRouteError(res, err);
        return;
      }
      sendError(
        res,
        ultrastarImportErrorStatus(err),
        err instanceof Error ? err.message : "Test konta USDB nieudany",
      );
    }
  });

  router.post("/ultrastar", async (req, res) => {
    try {
      const body = UltrastarFetchBodySchema.parse(req.body ?? {});
      const fetched = await fetchUsdbSong(body.url);
      res.json({
        content: fetched.content,
        metadata: fetched.metadata,
      });
    } catch (err) {
      if (isZodError(err)) {
        handleRouteError(res, err);
        return;
      }
      sendError(
        res,
        ultrastarImportErrorStatus(err),
        err instanceof Error ? err.message : "Import UltraStar (USDB) nieudany",
      );
    }
  });

  router.post("/ultrastar/search", async (req, res) => {
    try {
      const body = UltrastarSearchBodySchema.parse(req.body ?? {});
      const results = await searchUsdbSongs(body.title, body.artist);
      if (!results.length) {
        res.json({ results: [], message: "Brak wyników na USDB." });
        return;
      }
      res.json({
        results: results.map((row) => ({
          id: row.id,
          title: row.title,
          artist: row.artist,
          language: row.language,
          edition: row.edition,
          rating: row.rating,
          url: row.url,
        })),
      });
    } catch (err) {
      if (isZodError(err)) {
        handleRouteError(res, err);
        return;
      }
      sendError(
        res,
        ultrastarImportErrorStatus(err),
        err instanceof Error
          ? err.message
          : "Wyszukiwanie UltraStar (USDB) nieudane",
      );
    }
  });

  mountSessionYoutubeRoutes(router);

  return router;
}
