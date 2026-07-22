import { Router } from "express";
import {
  BatchMidiPcBodySchema,
  ExportLibraryBodySchema,
  normalizeLibraryImport,
  ProjectSchemaV5,
  type PutProjectBody,
} from "@stagesync/shared";
import type { Stores } from "../storage/index.js";
import { handleRouteError, sendError } from "./errors.js";

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

  router.post("/batch-midi-pc", async (req, res) => {
    try {
      const body = BatchMidiPcBodySchema.parse(req.body);
      const library = await stores.batchMidiProgramIds(body.assignments);
      res.json(library);
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.post("/export", async (req, res) => {
    try {
      const body = ExportLibraryBodySchema.parse(req.body ?? {});
      const ids = body.projectIds;
      const library = await stores.getLibrary();
      const selected = ids
        ? library.projects.filter((p) => ids.includes(p.id))
        : library.projects.filter((p) => p.isTemplate !== true);
      const projects = [];
      for (const entry of selected) {
        projects.push(await stores.getProject(entry.id));
      }
      const pack = {
        stagesyncExportVersion: 3,
        exportedAt: new Date().toISOString(),
        projects,
      };
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="stagesync-export-${Date.now()}.stagesync.json"`,
      );
      res.json(pack);
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.post("/import", async (req, res) => {
    try {
      let normalized;
      try {
        normalized = normalizeLibraryImport(req.body, {
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        sendError(
          res,
          400,
          err instanceof Error ? err.message : "Nieprawidłowy pakiet importu",
        );
        return;
      }
      const created: string[] = [];
      for (const item of normalized.projects) {
        if (!item || typeof item !== "object") continue;
        const src = item as Record<string, unknown>;
        const name =
          typeof src.name === "string" && src.name.trim()
            ? src.name
            : "Import";
        const project = await stores.createProject(name);
        try {
          const isTemplate = src.isTemplate === true;
          const candidate = {
            ...project,
            ...src,
            id: project.id,
            name,
            updatedAt: project.updatedAt,
            formatVersion: 5 as const,
            ppq: project.ppq,
            // Templates must not carry midiProgramId (ProjectSchemaV5).
            // createProject always assigns a PC — scrub it for template imports.
            isTemplate: isTemplate ? true : undefined,
            midiProgramId: isTemplate
              ? undefined
              : typeof src.midiProgramId === "number"
                ? src.midiProgramId
                : project.midiProgramId,
            // Keep migrated assets / lanes (JSON import does not copy bytes —
            // CLI `--uploads-dir` or Admin upload fills files).
            assets: Array.isArray(src.assets) ? src.assets : [],
            audioTracks: Array.isArray(src.audioTracks) ? src.audioTracks : [],
            audioClips: Array.isArray(src.audioClips) ? src.audioClips : [],
          };
          const parsed = ProjectSchemaV5.parse(candidate);
          const { id: _id, ...body } = parsed;
          void _id;
          await stores.putProject(project.id, body as PutProjectBody);
          created.push(project.id);
        } catch (err) {
          try {
            await stores.deleteProject(project.id);
          } catch {
            /* best-effort cleanup of partial import */
          }
          throw err;
        }
      }
      if (created.length === 0) {
        sendError(res, 400, "Import nie utworzył żadnego utworu");
        return;
      }
      const library = await stores.getLibrary();
      res.status(201).json({
        ok: true,
        created,
        format: normalized.format,
        warnings: normalized.warnings,
        library,
      });
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  return router;
}
