import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  resolveMeterAt,
  applyUgImportToProject,
  applyUltrastarImportToProject,
  applyUsUgBridgeToProject,
  placeContentFromForma,
  DEFAULT_PPQ,
  type Project,
  type UgImportOk,
  type UgTabMetadata,
  type UltrastarImportOk,
} from "@stagesync/shared";
import { createSongWithContent } from "@lib/client/desktopFileMenu.js";
import { uploadProjectAudio } from "@lib/shell-operator/projectAssetsApi.js";
import { putProject } from "@lib/shell-operator/libraryApi.js";
import { yieldToUi } from "@lib/audio/audioTempoAnalysis.js";
import type { UsUgApplyPayload } from "../../import/CombinedUsUgImportForm.js";

export type UseTimelineSongImportOpts = {
  projectId: string | null | undefined;
  draftProject: Project | null;
  draftRef: React.RefObject<Project | null>;
  commitDraft: (p: Project) => void;
  importAsNewSong: boolean;
  setImportApplying: (v: boolean) => void;
  closeImportModals: () => void;
  setSongScreenOpen: (v: boolean) => void;
  setSongMetaOpen: (v: boolean) => void;
  flashCanvasNotice: (msg: string) => void;
};

function mergeUgIntoProject(
  project: Project,
  result: UgImportOk,
  runWand: boolean,
  metadata?: UgTabMetadata | null,
): Project {
  let next = applyUgImportToProject(project, result);
  const title = metadata?.title?.trim();
  const artist = metadata?.artist?.trim();
  if (title) next = { ...next, name: title.slice(0, 200) };
  if (artist) next = { ...next, artist: artist.slice(0, 200) };
  if (runWand) {
    const wand = placeContentFromForma(next, "both");
    if (wand.ok) next = wand.project;
  }
  return next;
}

export function useTimelineSongImport({
  projectId,
  draftProject,
  draftRef,
  commitDraft,
  importAsNewSong,
  setImportApplying,
  closeImportModals,
  setSongScreenOpen,
  setSongMetaOpen,
  flashCanvasNotice,
}: UseTimelineSongImportOpts) {
  const navigate = useNavigate();

  const importPreviewOptions = useMemo(
    () =>
      importAsNewSong
        ? {
            ppq: DEFAULT_PPQ,
            meter: { numerator: 4, denominator: 4 } as const,
          }
        : draftProject
          ? {
              ppq: draftProject.ppq,
              meter: resolveMeterAt(draftProject, 0),
            }
          : {
              ppq: DEFAULT_PPQ,
              meter: { numerator: 4, denominator: 4 } as const,
            },
    [importAsNewSong, draftProject],
  );

  const onImportUg = useCallback(
    async (
      result: UgImportOk,
      runWand: boolean,
      metadata?: UgTabMetadata | null,
    ) => {
      if (importAsNewSong) {
        setImportApplying(true);
        try {
          const name =
            metadata?.title?.trim() ||
            `Import UG ${new Date().toLocaleTimeString("pl")}`;
          const saved = await createSongWithContent(name, (shell) =>
            mergeUgIntoProject(shell, result, runWand, metadata),
          );
          closeImportModals();
          setSongScreenOpen(false);
          flashCanvasNotice(
            runWand
              ? `Nowy utwór „${saved.name}": Import UG (${result.sections.length} sekcji) + Różdżka`
              : `Nowy utwór „${saved.name}": Import UG (${result.sections.length} sekcji)`,
          );
          navigate(`/timeline/${saved.id}`);
        } catch (err) {
          setImportApplying(false);
          flashCanvasNotice(
            err instanceof Error ? err.message : "Import UG nie powiódł się",
          );
        }
        return;
      }
      const draft = draftRef.current;
      if (!draft) return;
      const next = mergeUgIntoProject(draft, result, runWand, metadata);
      commitDraft(next);
      flashCanvasNotice(
        runWand
          ? `Import UG: ${result.sections.length} sekcji + Różdżka — sprawdź Formę i Tap`
          : `Import UG: ${result.sections.length} sekcji — Różdżka (W) gdy Formę dopracujesz`,
      );
      closeImportModals();
      setSongScreenOpen(false);
    },
    [
      importAsNewSong,
      draftRef,
      commitDraft,
      setImportApplying,
      closeImportModals,
      setSongScreenOpen,
      flashCanvasNotice,
      navigate,
    ],
  );

  const onImportUltrastar = useCallback(
    async (result: UltrastarImportOk) => {
      if (importAsNewSong) {
        setImportApplying(true);
        try {
          const name =
            result.title?.trim() ||
            `Import UltraStar ${new Date().toLocaleTimeString("pl")}`;
          const saved = await createSongWithContent(name, (shell) =>
            applyUltrastarImportToProject(shell, result),
          );
          closeImportModals();
          setSongScreenOpen(false);
          setSongMetaOpen(false);
          flashCanvasNotice(
            `Nowy utwór „${saved.name}": Import UltraStar (${result.syllableCount} sylab)`,
          );
          navigate(`/timeline/${saved.id}`);
        } catch (err) {
          setImportApplying(false);
          flashCanvasNotice(
            err instanceof Error
              ? err.message
              : "Import UltraStar nie powiódł się",
          );
        }
        return;
      }
      const draft = draftRef.current;
      if (!draft) return;
      const next = applyUltrastarImportToProject(draft, result);
      commitDraft(next);
      flashCanvasNotice(
        `Import UltraStar: ${result.syllableCount} sylab / ${result.tekst.clips.length} linii w draftcie — Zapisz (⌘S), aby utrwalić`,
      );
      closeImportModals();
      setSongScreenOpen(false);
      setSongMetaOpen(false);
    },
    [
      importAsNewSong,
      draftRef,
      commitDraft,
      setImportApplying,
      closeImportModals,
      setSongScreenOpen,
      setSongMetaOpen,
      flashCanvasNotice,
      navigate,
    ],
  );

  const onImportUsUgBridge = useCallback(
    async (payload: UsUgApplyPayload) => {
      const result = payload.bridge;
      const smartAudio = payload.smartTempoAudio;
      const pendingFile = payload.pendingAudioFile;
      const warn =
        result.approximate || result.warnings.length > 0
          ? " · sprawdź Formę / akordy"
          : "";
      const summary = `${result.sections.length} sekcji · ${result.akordy.clips.length} akordów · dopasowanie ${Math.round(result.alignScore * 100)}%${warn}`;
      setImportApplying(true);
      await yieldToUi();
      if (importAsNewSong) {
        try {
          const name =
            result.title?.trim() ||
            `Import US+UG ${new Date().toLocaleTimeString("pl")}`;
          let saved = await createSongWithContent(name, (shell) =>
            applyUsUgBridgeToProject(shell, result, {
              // Place clip only after real upload (skip synthetic local-* ids).
              smartTempoAudio: pendingFile ? undefined : smartAudio,
            }),
          );
          if (pendingFile && saved.id) {
            saved = await uploadProjectAudio(saved.id, pendingFile, {
              startTicks: 0,
            });
            const asset = saved.assets.at(-1);
            if (asset && smartAudio) {
              const withClip = applyUsUgBridgeToProject(saved, result, {
                smartTempoAudio: {
                  ...smartAudio,
                  assetId: asset.id,
                },
              });
              saved = await putProject(saved.id, {
                ...withClip,
                id: saved.id,
                updatedAt: saved.updatedAt,
                midiProgramId: saved.midiProgramId,
              });
            }
          }
          closeImportModals();
          setSongScreenOpen(false);
          setSongMetaOpen(false);
          flashCanvasNotice(
            `Nowy utwór „${saved.name}": Import US+UG (${summary})`,
          );
          navigate(`/timeline/${saved.id}`);
        } catch (err) {
          setImportApplying(false);
          flashCanvasNotice(
            err instanceof Error ? err.message : "Import US+UG nie powiódł się",
          );
        }
        return;
      }
      const draft = draftRef.current;
      if (!draft) return;
      const baseDraft = payload.serverProjectSnapshot
        ? {
            ...draft,
            updatedAt: payload.serverProjectSnapshot.updatedAt,
            assets: payload.serverProjectSnapshot.assets,
            audioTracks: payload.serverProjectSnapshot.audioTracks,
            audioClips: payload.serverProjectSnapshot.audioClips,
          }
        : draft;
      let next = applyUsUgBridgeToProject(baseDraft, result, {
        smartTempoAudio: smartAudio,
      });
      if (pendingFile && projectId) {
        next = await uploadProjectAudio(projectId, pendingFile, {
          startTicks: 0,
        });
        const asset = next.assets.at(-1);
        if (asset && smartAudio) {
          next = applyUsUgBridgeToProject(next, result, {
            smartTempoAudio: { ...smartAudio, assetId: asset.id },
          });
        }
      }
      if (projectId) {
        try {
          next = await putProject(projectId, next);
        } catch (err) {
          console.warn(
            "[TimelineShell] Auto-save on import failed, keeping draft:",
            err,
          );
        }
      }
      commitDraft(next);
      flashCanvasNotice(`Import US+UG: ${summary}`);
      closeImportModals();
      setSongScreenOpen(false);
      setSongMetaOpen(false);
    },
    [
      projectId,
      importAsNewSong,
      draftRef,
      commitDraft,
      setImportApplying,
      closeImportModals,
      setSongScreenOpen,
      setSongMetaOpen,
      flashCanvasNotice,
      navigate,
    ],
  );

  return {
    importPreviewOptions,
    onImportUg,
    onImportUltrastar,
    onImportUsUgBridge,
  };
}
