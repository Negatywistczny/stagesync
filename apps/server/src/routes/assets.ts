import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { Router } from "express";
import multer from "multer";
import { createReadStream } from "node:fs";
import type { Stores } from "../storage/index.js";
import { handleRouteError, sendError } from "./errors.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

function uploadSingleFile(
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction,
): void {
  upload.single("file")(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      sendError(res, 413, "File too large");
      return;
    }
    if (err) {
      sendError(
        res,
        400,
        err instanceof Error ? err.message : "Upload failed",
      );
      return;
    }
    next();
  });
}

const AUDIO_EXT = new Set([
  ".mp3",
  ".wav",
  ".aiff",
  ".aif",
  ".m4a",
  ".flac",
  ".ogg",
]);

const MUSICXML_EXT = new Set([".musicxml", ".xml", ".mxl"]);

function extFromName(name: string): string {
  const ext = extname(name).toLowerCase();
  return ext || ".bin";
}

function mimeForExt(ext: string): string {
  switch (ext) {
    case ".mp3":
      return "audio/mpeg";
    case ".wav":
      return "audio/wav";
    case ".aiff":
    case ".aif":
      return "audio/aiff";
    case ".m4a":
      return "audio/mp4";
    case ".flac":
      return "audio/flac";
    case ".ogg":
      return "audio/ogg";
    case ".musicxml":
    case ".xml":
      return "application/vnd.recordare.musicxml+xml";
    case ".mxl":
      return "application/vnd.recordare.musicxml";
    default:
      return "application/octet-stream";
  }
}

export function createAssetsRouter(stores: Stores): Router {
  const router = Router({ mergeParams: true });

  function projectIdFrom(req: { params: Record<string, unknown> }): string {
    const raw = req.params["id"];
    const id = Array.isArray(raw) ? raw[0] : raw;
    if (typeof id !== "string" || !id) {
      throw new Error("Missing project id");
    }
    return id;
  }

  function assetIdFrom(req: { params: Record<string, unknown> }): string {
    const raw = req.params["assetId"];
    const id = Array.isArray(raw) ? raw[0] : raw;
    if (typeof id !== "string" || !id) {
      throw new Error("Missing asset id");
    }
    return id;
  }

  router.get("/", async (req, res) => {
    try {
      const project = await stores.getProject(projectIdFrom(req));
      res.json({ assets: project.assets });
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.post("/", uploadSingleFile, async (req, res) => {
    try {
      const projectId = projectIdFrom(req);
      const file = req.file;
      if (!file) {
        sendError(res, 400, "Missing file field");
        return;
      }
      const originalName = file.originalname || "audio.bin";
      const ext = extFromName(originalName);
      const isMusicXml = MUSICXML_EXT.has(ext);
      const isAudio = AUDIO_EXT.has(ext);
      if (!isAudio && !isMusicXml) {
        sendError(
          res,
          400,
          `Unsupported type: ${ext}. Allowed: audio (mp3/wav/…) or MusicXML (.musicxml/.xml/.mxl)`,
        );
        return;
      }
      const assetId = randomUUID();
      const storageName = `${assetId}${ext}`;
      const project = await stores.addProjectAsset(
        projectId,
        {
          id: assetId,
          storageName,
          originalName,
          kind: isMusicXml ? "musicxml" : "audio",
          mimeType: file.mimetype || mimeForExt(ext),
          sizeBytes: file.size,
        },
        file.buffer,
        { createAudioClip: isAudio },
      );
      res.status(201).json(project);
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.delete("/:assetId", async (req, res) => {
    try {
      const project = await stores.deleteProjectAsset(
        projectIdFrom(req),
        assetIdFrom(req),
      );
      res.json(project);
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.get("/:assetId/file", async (req, res) => {
    try {
      const { path: filePath, asset } = await stores.getAssetFilePath(
        projectIdFrom(req),
        assetIdFrom(req),
      );
      res.setHeader("Content-Type", asset.mimeType);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(asset.originalName)}"`,
      );
      createReadStream(filePath).pipe(res);
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  return router;
}
