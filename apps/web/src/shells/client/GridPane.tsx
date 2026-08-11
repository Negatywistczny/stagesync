import styles from "./ClientShell.module.css";
import {
  applyInstrumentPitchToChord,
  resolveChordNameParts,
  resolveKeyAt,
  formatSectionNameForDisplay,
  type ChordNameParts,
  type Project,
} from "@stagesync/shared";
import { buildGridLiveContext } from "@lib/timeline/clientGrid.js";
import type { ClientDisplayPrefs } from "@lib/client/clientDisplayPrefs.js";
import { GridPaneBody } from "./GridPaneBody.js";

type Props = {
  project: Project | null;
  displayTicks: number;
  loading: boolean;
  hasActiveProjectId: boolean;
  prefs: ClientDisplayPrefs;
  teamSemitones?: number;
};

export function GridPane({
  project,
  displayTicks,
  loading,
  hasActiveProjectId,
  prefs,
  teamSemitones = 0,
}: Props) {
  if (!hasActiveProjectId) {
    return (
      <p className={styles.empty} role="status" aria-live="polite">
        Oczekiwanie na utwór…
      </p>
    );
  }
  if (loading && !project) {
    return (
      <p className={styles.empty} role="status" aria-live="polite">
        Wczytywanie utworu…
      </p>
    );
  }
  if (!project) {
    return (
      <p className={styles.empty} role="status" aria-live="polite">
        Nie udało się wczytać utworu.
      </p>
    );
  }

  const ctx = buildGridLiveContext(project, displayTicks);
  if (ctx.emptyReason) {
    return (
      <p className={styles.empty} role="status" aria-live="polite">
        {ctx.emptyReason}
      </p>
    );
  }

  const key = resolveKeyAt(project, displayTicks);
  const fmtParts = (symbol: string): ChordNameParts =>
    resolveChordNameParts(
      applyInstrumentPitchToChord(
        symbol,
        prefs.instrumentPitch,
        prefs.instrumentPitchManual,
        key,
        teamSemitones,
      ),
      {
        literalQuality: prefs.literalQuality,
        hybridPolishB: prefs.hybridPolishB,
      },
    );

  const sectionDisplay =
    ctx.sectionName == null
      ? null
      : formatSectionNameForDisplay(ctx.sectionName, {
          polish: prefs.sectionNamesPolish,
        });
  const subsectionLabel =
    sectionDisplay != null &&
    ctx.subsectionCount != null &&
    ctx.subsectionCount > 1 &&
    ctx.subsectionIndex != null
      ? `${sectionDisplay} · ${ctx.subsectionIndex + 1}/${ctx.subsectionCount}`
      : sectionDisplay;

  return (
    <GridPaneBody
      subsectionLabel={subsectionLabel}
      cycle={ctx.cycle}
      nextCycle={ctx.nextCycle}
      carouselKey={ctx.carouselKey}
      countdownPreview={ctx.countdownPreview}
      heroRaw={ctx.hero}
      heroNextRaw={ctx.heroNext}
      isCountdown={ctx.isCountdown}
      fmtParts={fmtParts}
      gridAnimations={prefs.gridAnimations}
    />
  );
}
