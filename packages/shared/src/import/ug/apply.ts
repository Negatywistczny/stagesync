/**
 * Ultimate Guitar / ChordPro-lite import — apply + reflow into Project.
 */

import { withWholeLineTekstBlocks } from "../../project/project-seed.js";
import type { FormaClip, Project } from "../../project/schema.js";
import { DEFAULT_PPQ, ticksPerBar } from "../../time-tempo/time.js";
import { sealAkordyLengths } from "./chords.js";
import { UgImportPayloadSchema } from "./payload.js";
import type { UgImportOk, UgImportOptions, UgImportResult } from "./types.js";

/**
 * Merge UG import into a Project: keep Countdown Forma clips; replace music
 * Forma sections + Tekst + Akordy.
 */
export function applyUgImportToProject(
  project: Project,
  imported: UgImportOk,
): Project {
  const countdown = project.forma.clips.filter((c) => c.kind === "countdown");
  return {
    ...project,
    forma: { clips: [...countdown, ...imported.formaMusic.clips] },
    tekst: imported.tekst,
    akordy: imported.akordy,
  };
}

/**
 * Rebuild Forma lengths from operator-edited bars-per-section and scale
 * Tekst/Akordy within each section onto the new spans (preview → apply).
 */
export function reflowUgImportSectionBars(
  imported: UgImportOk,
  sectionBars: number[],
  options: Pick<UgImportOptions, "ppq" | "meter" | "contentFloorTicks"> = {},
): UgImportResult {
  const n = imported.formaMusic.clips.length;
  if (sectionBars.length !== n || imported.sections.length !== n) {
    return {
      ok: false,
      message: "Liczba długości sekcji nie pasuje do podglądu Formy.",
    };
  }
  const ppq = options.ppq ?? DEFAULT_PPQ;
  const meter = options.meter ?? { numerator: 4, denominator: 4 };
  const barTicks = ticksPerBar(meter, ppq);
  if (!Number.isFinite(barTicks) || barTicks <= 0) {
    return { ok: false, message: "Nieprawidłowe metrum przy reflow UG." };
  }
  const floor = options.contentFloorTicks ?? 0;

  const bars = sectionBars.map((b) => {
    const v = Math.trunc(Number(b));
    if (!Number.isFinite(v)) return 1;
    return Math.min(256, Math.max(1, v));
  });

  const oldClips = imported.formaMusic.clips;
  const newForma: FormaClip[] = [];
  let cursor = floor;
  for (let i = 0; i < n; i++) {
    const old = oldClips[i]!;
    const lengthTicks = bars[i]! * barTicks;
    newForma.push({
      ...old,
      startTicks: cursor,
      lengthTicks: Math.max(1, lengthTicks),
      kind: "section",
    });
    cursor += lengthTicks;
  }

  const mapClip = <T extends { startTicks: number; lengthTicks: number }>(
    clip: T,
  ): T => {
    for (let i = 0; i < n; i++) {
      const old = oldClips[i]!;
      const neu = newForma[i]!;
      const oldEnd = old.startTicks + old.lengthTicks;
      if (clip.startTicks < old.startTicks || clip.startTicks >= oldEnd) {
        continue;
      }
      const rel =
        old.lengthTicks > 0
          ? (clip.startTicks - old.startTicks) / old.lengthTicks
          : 0;
      const scale = old.lengthTicks > 0 ? neu.lengthTicks / old.lengthTicks : 1;
      return {
        ...clip,
        startTicks: neu.startTicks + Math.round(rel * neu.lengthTicks),
        lengthTicks: Math.max(1, Math.round(clip.lengthTicks * scale)),
      };
    }
    return clip;
  };

  const tekstClips = imported.tekst.clips.map((clip) => {
    const mapped = mapClip(clip);
    return withWholeLineTekstBlocks({
      id: mapped.id,
      startTicks: mapped.startTicks,
      lengthTicks: mapped.lengthTicks,
      text: mapped.text,
      ...(mapped.sourceSection != null
        ? { sourceSection: mapped.sourceSection }
        : {}),
    });
  });
  const akordClips = sealAkordyLengths(imported.akordy.clips.map(mapClip));
  const sections = imported.sections.map((s, i) => ({
    ...s,
    estimatedBars: bars[i]!,
  }));

  const payload = UgImportPayloadSchema.safeParse({
    tekst: { clips: tekstClips },
    akordy: { clips: akordClips },
    formaMusic: { clips: newForma },
  });
  if (!payload.success) {
    return {
      ok: false,
      message: "Reflow UG nie przeszedł walidacji schematu.",
    };
  }

  return {
    ok: true,
    tekst: payload.data.tekst,
    akordy: payload.data.akordy,
    formaMusic: payload.data.formaMusic,
    sections,
    barsPerLine: imported.barsPerLine,
  };
}
