import { useNavigate } from "react-router";
import {
  applyUgImportToProject,
  applyUltrastarImportToProject,
  applyUsUgBridgeToProject,
  importUgText,
  placeContentFromForma,
  reflowUgImportSectionBars,
  resolveMeterAt,
} from "@stagesync/shared";
import { fetchProject, putProject } from "@lib/shell-operator/libraryApi.js";
import { uploadProjectAudio } from "@lib/shell-operator/projectAssetsApi.js";
import { createSongWithContent } from "@lib/client/desktopFileMenu.js";

interface UseAdminImportHandlersArgs {
  selectedId: string | null;
  setCommandPending: (pending: boolean) => void;
  setImportModalOpen: (open: boolean) => void;
  setActionNotice: (notice: string | null) => void;
  refreshLibrary: (id: string | null) => Promise<any>;
}

export function useAdminImportHandlers({
  selectedId,
  setCommandPending,
  setImportModalOpen,
  setActionNotice,
  refreshLibrary,
}: UseAdminImportHandlersArgs) {
  const navigate = useNavigate();

  const onApplyUg = async ({
    text,
    barsPerLine,
    sectionBars,
    runWand,
    metadata,
  }: any) => {
    setCommandPending(true);
    try {
      if (selectedId) {
        const project = await fetchProject(selectedId);
        const meter = resolveMeterAt(project, 0);
        const parsed = importUgText(text, {
          ppq: project.ppq,
          meter,
          barsPerLine,
        });
        if (!parsed.ok) throw new Error(parsed.message);
        const reflowed = reflowUgImportSectionBars(parsed, sectionBars, {
          ppq: project.ppq,
          meter,
        });
        if (!reflowed.ok) throw new Error(reflowed.message);
        let next = applyUgImportToProject(project, reflowed);
        const title = metadata?.title?.trim();
        const artist = metadata?.artist?.trim();
        if (title) next = { ...next, name: title.slice(0, 200) };
        if (artist) next = { ...next, artist: artist.slice(0, 200) };
        if (runWand) {
          const wand = placeContentFromForma(next, "both");
          if (wand.ok) next = wand.project;
        }
        await putProject(selectedId, next);
        setImportModalOpen(false);
        setActionNotice(
          runWand
            ? `Import UG: ${reflowed.sections.length} sekcji + Różdżka. Sprawdź w Timeline.`
            : `Import UG: ${reflowed.sections.length} sekcji — w Timeline Różdżka (W) po dopracowaniu Formy.`,
        );
        await refreshLibrary(selectedId);
        return;
      }
      const name =
        metadata?.title?.trim() ||
        `Import UG ${new Date().toLocaleTimeString("pl")}`;
      const saved = await createSongWithContent(name, (shell) => {
        const meter = resolveMeterAt(shell, 0);
        const parsed = importUgText(text, {
          ppq: shell.ppq,
          meter,
          barsPerLine,
        });
        if (!parsed.ok) throw new Error(parsed.message);
        const reflowed = reflowUgImportSectionBars(parsed, sectionBars, {
          ppq: shell.ppq,
          meter,
        });
        if (!reflowed.ok) throw new Error(reflowed.message);
        let next = applyUgImportToProject(shell, reflowed);
        const title = metadata?.title?.trim();
        const artist = metadata?.artist?.trim();
        if (title) next = { ...next, name: title.slice(0, 200) };
        if (artist) next = { ...next, artist: artist.slice(0, 200) };
        if (runWand) {
          const wand = placeContentFromForma(next, "both");
          if (wand.ok) next = wand.project;
        }
        return next;
      });
      setImportModalOpen(false);
      setActionNotice(`Nowy utwór „${saved.name}”: Import UG`);
      await refreshLibrary(saved.id);
      navigate(`/timeline/${saved.id}`);
    } finally {
      setCommandPending(false);
    }
  };

  const onApplyUltrastar = async (result: any) => {
    setCommandPending(true);
    try {
      if (selectedId) {
        const project = await fetchProject(selectedId);
        const next = applyUltrastarImportToProject(project, result);
        await putProject(selectedId, next);
        setImportModalOpen(false);
        setActionNotice(
          `Import UltraStar: ${result.syllableCount} sylab. Sprawdź w Timeline.`,
        );
        await refreshLibrary(selectedId);
        return;
      }
      const name =
        result.title?.trim() ||
        `Import UltraStar ${new Date().toLocaleTimeString("pl")}`;
      const saved = await createSongWithContent(name, (shell) =>
        applyUltrastarImportToProject(shell, result),
      );
      setImportModalOpen(false);
      setActionNotice(`Nowy utwór „${saved.name}”: Import UltraStar`);
      await refreshLibrary(saved.id);
      navigate(`/timeline/${saved.id}`);
    } finally {
      setCommandPending(false);
    }
  };

  const onApplyUsUg = async (payload: any) => {
    const result = payload.bridge;
    const smartAudio = payload.smartTempoAudio;
    const pendingFile = payload.pendingAudioFile;
    setCommandPending(true);
    try {
      if (selectedId) {
        let project = await fetchProject(selectedId);
        if (payload.serverProjectSnapshot) {
          project = {
            ...project,
            updatedAt: payload.serverProjectSnapshot.updatedAt,
            assets: payload.serverProjectSnapshot.assets,
            audioTracks: payload.serverProjectSnapshot.audioTracks,
            audioClips: payload.serverProjectSnapshot.audioClips,
          };
        }
        let next = applyUsUgBridgeToProject(project, result, {
          smartTempoAudio: smartAudio,
        });
        if (pendingFile) {
          next = await uploadProjectAudio(selectedId, pendingFile, {
            startTicks: 0,
          });
          const asset = next.assets.at(-1);
          if (asset && smartAudio) {
            next = applyUsUgBridgeToProject(next, result, {
              smartTempoAudio: {
                ...smartAudio,
                assetId: asset.id,
              },
            });
          }
        }
        await putProject(selectedId, next);
        setImportModalOpen(false);
        setActionNotice(
          `Import US+UG: ${result.sections.length} sekcji. Sprawdź w Timeline.`,
        );
        await refreshLibrary(selectedId);
        return;
      }
      const name =
        result.title?.trim() ||
        `Import US+UG ${new Date().toLocaleTimeString("pl")}`;
      let saved = await createSongWithContent(name, (shell) =>
        applyUsUgBridgeToProject(shell, result, {
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
      setImportModalOpen(false);
      setActionNotice(`Nowy utwór „${saved.name}”: Import US+UG`);
      await refreshLibrary(saved.id);
      navigate(`/timeline/${saved.id}`);
    } finally {
      setCommandPending(false);
    }
  };

  return { onApplyUg, onApplyUltrastar, onApplyUsUg };
}
