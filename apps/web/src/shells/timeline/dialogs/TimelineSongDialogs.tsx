import React from "react";
import { Link } from "react-router";
import type { Project, UgImportOk, UgTabMetadata, UltrastarImportOk } from "@stagesync/shared";
import { Button } from "@stagesync/ui";
import { ShellIconButton } from "../../components/ShellIconButton.js";
import { IconClose } from "../../components/icons.js";
import { putProject } from "@lib/shell-operator/libraryApi.js";
import {
  createDraftHistory,
  syncPresentAfterSave,
  type DraftHistory,
} from "@lib/client/draftHistory.js";
import { SongImportWizard } from "../../import/SongImportWizard.js";
import { TimelineHelp } from "../TimelineHelp.js";
import styles from "../TimelineShell.module.css";

export type TimelineSongDialogsProps = {
  blocker: {
    state: "unblocked" | "blocked" | "proceeding";
    reset?: () => void;
    proceed?: () => void;
  };
  projectId?: string;
  draftProject: Project | null;
  savePending: boolean;
  setSavePending: (pending: boolean) => void;
  setSavedProject: (p: Project | null) => void;
  setDraftProject: (p: Project | null) => void;
  setDraftHistory: (fn: (h: DraftHistory | null) => DraftHistory | null) => void;
  setLoadError: (err: string | null) => void;
  onDiscard: () => void;
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
  songScreenOpen: boolean;
  setSongScreenOpen: (open: boolean) => void;
  songScreenId: string;
  libraryNames: Array<{ id: string; name: string }>;
  songImportOpen: boolean;
  importAsNewSong: boolean;
  importApplying: boolean;
  importPreviewOptions: any;
  openSongImportWizard: (asNew: boolean) => void;
  closeImportModals: () => void;
  onImportUsUgBridge: (res: any) => void;
  onImportUltrastar: (res: UltrastarImportOk) => void;
  onImportUg: (
    result: UgImportOk,
    runWand: boolean,
    metadata?: UgTabMetadata | null,
  ) => void;
};

export function TimelineSongDialogs({
  blocker,
  projectId,
  draftProject,
  savePending,
  setSavePending,
  setSavedProject,
  setDraftProject,
  setDraftHistory,
  setLoadError,
  onDiscard,
  helpOpen,
  setHelpOpen,
  songScreenOpen,
  setSongScreenOpen,
  songScreenId,
  libraryNames,
  songImportOpen,
  importAsNewSong,
  importApplying,
  importPreviewOptions,
  openSongImportWizard,
  closeImportModals,
  onImportUsUgBridge,
  onImportUltrastar,
  onImportUg,
}: TimelineSongDialogsProps) {
  return (
    <>
      {blocker.state === "blocked" ? (
        <div
          className={styles.overlay}
          role="alertdialog"
          aria-modal
          aria-labelledby="dirty-guard-title"
        >
          <div className={styles.overlayPanel}>
            <h2 id="dirty-guard-title">Niezapisane zmiany</h2>
            <p className={styles.overlayBody}>
              Masz niezapisane zmiany. Opuścić Timeline bez zapisu?
            </p>
            <div className={styles.overlayActions}>
              <Button variant="ghost" onClick={() => blocker.reset?.()}>
                Anuluj
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  onDiscard();
                  blocker.proceed?.();
                }}
              >
                Odrzuć i wyjdź
              </Button>
              <Button
                variant="primary"
                loading={savePending}
                onClick={() => {
                  void (async () => {
                    if (!projectId || !draftProject) return;
                    setSavePending(true);
                    try {
                      const next = await putProject(projectId, draftProject);
                      setSavedProject(next);
                      setDraftProject(next);
                      setDraftHistory((h) =>
                        h
                          ? syncPresentAfterSave(h, next)
                          : createDraftHistory(next),
                      );
                      blocker.proceed?.();
                    } catch (err) {
                      setLoadError(
                        err instanceof Error
                          ? err.message
                          : "Zapis nie powiódł się",
                      );
                    } finally {
                      setSavePending(false);
                    }
                  })();
                }}
              >
                Zapisz i wyjdź
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {helpOpen ? (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal
          aria-labelledby="tl-help-title"
        >
          <button
            type="button"
            className={styles.backdrop}
            aria-label="Zamknij"
            onClick={() => setHelpOpen(false)}
          />
          <div
            className={[styles.overlayPanel, styles.helpOverlayPanel]
              .filter(Boolean)
              .join(" ")}
          >
            <TimelineHelp onClose={() => setHelpOpen(false)} />
          </div>
        </div>
      ) : null}

      {songScreenOpen ? (
        <div
          id={songScreenId}
          className={styles.overlay}
          role="dialog"
          aria-modal
          aria-labelledby="song-screen-title"
        >
          <button
            type="button"
            className={styles.backdrop}
            aria-label="Zamknij"
            onClick={() => setSongScreenOpen(false)}
          />
          <div className={styles.overlayPanel}>
            <div className={styles.overlayHead}>
              <h2 id="song-screen-title">Wybierz utwór</h2>
              <ShellIconButton
                label="Zamknij"
                onClick={() => setSongScreenOpen(false)}
              >
                <IconClose />
              </ShellIconButton>
            </div>
            <div className={styles.overlayBody}>
              <ul className={styles.songList}>
                {libraryNames.map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/timeline/${p.id}`}
                      onClick={() => setSongScreenOpen(false)}
                    >
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
              {libraryNames.length === 0 ? (
                <p className={styles.muted}>Brak utworów w bibliotece.</p>
              ) : null}
              <div className={styles.overlayActions}>
                <Button
                  variant="primary"
                  onClick={() => openSongImportWizard(true)}
                >
                  Importuj…
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {songImportOpen && (importAsNewSong || draftProject) ? (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal
          aria-labelledby="song-import-title"
        >
          <button
            type="button"
            className={styles.backdrop}
            aria-label="Zamknij"
            onClick={closeImportModals}
          />
          <div
            className={[styles.overlayPanel, styles.usUgOverlayPanel]
              .filter(Boolean)
              .join(" ")}
          >
            <div className={styles.usUgOverlayHead}>
              <h2 id="song-import-title">
                {importAsNewSong ? "Importuj utwór — nowy" : "Importuj utwór"}
              </h2>
              <ShellIconButton label="Zamknij" onClick={closeImportModals}>
                <IconClose />
              </ShellIconButton>
            </div>
            <div className={styles.usUgOverlayBody}>
              <SongImportWizard
                applyLabel={
                  importAsNewSong ? "Utwórz nowy utwór" : "Importuj do projektu"
                }
                applying={importApplying}
                projectId={
                  importAsNewSong ? undefined : (projectId ?? undefined)
                }
                importOptions={importPreviewOptions}
                initialTitle={importAsNewSong ? undefined : draftProject?.name}
                initialArtist={
                  importAsNewSong ? undefined : draftProject?.artist
                }
                onCancel={closeImportModals}
                onApplyUsUg={onImportUsUgBridge}
                onApplyUltrastar={onImportUltrastar}
                onApplyUg={({ result, runWand, metadata }: { result: UgImportOk; runWand: boolean; metadata?: UgTabMetadata | null }) =>
                  onImportUg(result, runWand, metadata)
                }
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
