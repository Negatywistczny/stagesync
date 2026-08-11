/**
 * Różdżka — place Tekst / Akordy onto existing Forma sections (v4 parity).
 * Pure; Forma clips are never mutated. Countdown / digit clips stay put.
 *
 * Port of legacy `placeVocalsFromForma` (A–F) + `placeChordsFromForma` (A–E + L).
 */

import type { Project } from "../project/schema.js";
import {
  type WandMode,
  type WandResult,
  type WandScope,
} from "./wand/wand-types.js";
import { placeTekstFromForma } from "./wand/wand-lyrics.js";
import { placeAkordyFromForma } from "./wand/wand-chords.js";

export {
  type WandMode,
  type WandResult,
  type WandScope,
} from "./wand/wand-types.js";

/**
 * Place Tekst and/or Akordy onto Forma section lengths.
 * Forma is never modified (v4 `placeVocalsFromForma` / `placeChordsFromForma`).
 */
export function placeContentFromForma(
  project: Project,
  mode: WandMode,
  scope: WandScope = {},
): WandResult {
  if (mode === "tekst") return placeTekstFromForma(project, scope);
  if (mode === "akordy") return placeAkordyFromForma(project, scope);

  const vocals = placeTekstFromForma(project, scope);
  if (!vocals.ok) return vocals;
  const chords = placeAkordyFromForma(vocals.project, scope);
  if (!chords.ok) {
    return {
      ...chords,
      project: vocals.project,
      approximate: vocals.approximate,
      message: chords.message
        ? `Tekst OK, ale ${chords.message}`
        : "Tekst OK, ale Akordy się nie udały",
    };
  }
  return {
    project: chords.project,
    ok: true,
    placed: vocals.placed + chords.placed,
    approximate: Boolean(vocals.approximate || chords.approximate),
    message: `Tekst + Akordy → Forma: ${vocals.placed} linii, ${chords.placed} clipów`,
  };
}

/** @deprecated Use {@link placeContentFromForma} — name was inverted vs v4. */
export function wandContentToForma(
  project: Project,
  mode: WandMode,
  scope: WandScope = {},
): Project {
  return placeContentFromForma(project, mode, scope).project;
}
