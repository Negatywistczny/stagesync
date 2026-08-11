import type { Router } from "express";
import { RestoreBackupBodySchema } from "@stagesync/shared";
import {
  restoreBulkFromBackups,
  restoreFromBackup,
  restoreFromZipArchive,
} from "../../storage/restore-backup.js";
import { sendError, handleRouteError } from "../errors.js";
import { assertLifecycleAllowed } from "./lifecycle-auth.js";

type RestoreMountContext = {
  dataDir: string | null;
};

/** POST /restore — `.bak`, bulk `.bak`, or `.zip` into data tree. */
export function mountRestoreRoutes(
  router: Router,
  ctx: RestoreMountContext,
): void {
  const { dataDir } = ctx;

  router.post("/restore", async (req, res) => {
    if (!assertLifecycleAllowed(req, res)) return;
    if (!dataDir) {
      sendError(res, 500, "Katalog danych hosta nie jest skonfigurowany");
      return;
    }
    try {
      const body = RestoreBackupBodySchema.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({
          ok: false,
          error: "Invalid body",
          details: body.error.issues,
        });
        return;
      }

      if ("paths" in body.data) {
        const many = await restoreBulkFromBackups({
          bakPaths: body.data.paths,
          dataDir,
        });
        const n = many.restored.length;
        res.json({
          ok: true,
          restored: many.restored,
          count: n,
          bakPath: many.restored[0]?.source,
          targetPath: many.restored[0]?.targetPath,
          shadowed: many.restored[0]?.shadowed ?? null,
          message:
            n === 1
              ? "Przywrócono kopię. Odśwież Admin / Timeline, jeśli otwarty był ten projekt."
              : `Przywrócono ${n} plików. Odśwież Admin / Timeline, jeśli otwarty był ten projekt.`,
        });
        return;
      }

      const path = body.data.path;
      if (path.toLowerCase().endsWith(".zip")) {
        const many = await restoreFromZipArchive({ zipPath: path, dataDir });
        const n = many.restored.length;
        res.json({
          ok: true,
          restored: many.restored,
          count: n,
          bakPath: path,
          targetPath: many.restored[0]?.targetPath,
          shadowed: many.restored[0]?.shadowed ?? null,
          message: `Przywrócono archiwum ZIP (${n} plik${n === 1 ? "" : "ów"}). Odśwież Admin / Timeline, jeśli otwarty był ten projekt.`,
        });
        return;
      }

      const result = await restoreFromBackup({
        bakPath: path,
        dataDir,
      });
      res.json({
        ok: true,
        bakPath: result.bakPath,
        targetPath: result.targetPath,
        shadowed: result.shadowed,
        restored: [
          {
            source: result.bakPath,
            targetPath: result.targetPath,
            shadowed: result.shadowed,
          },
        ],
        count: 1,
        message:
          "Przywrócono kopię. Odśwież Admin / Timeline, jeśli otwarty był ten projekt.",
      });
    } catch (err) {
      if (err instanceof Error) {
        sendError(res, 400, err.message);
        return;
      }
      handleRouteError(res, err);
    }
  });
}
