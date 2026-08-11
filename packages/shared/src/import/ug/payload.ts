/**
 * Ultimate Guitar / ChordPro-lite import — Zod payload schema.
 */

import { z } from "zod";
import {
  AkordClipSchema,
  FormaClipSchema,
  TekstClipSchema,
} from "../../project/schema.js";

export const UgImportPayloadSchema = z.object({
  tekst: z.object({ clips: z.array(TekstClipSchema) }),
  akordy: z.object({ clips: z.array(AkordClipSchema) }),
  formaMusic: z.object({ clips: z.array(FormaClipSchema) }),
});
