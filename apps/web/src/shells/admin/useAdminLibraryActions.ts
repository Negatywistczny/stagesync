import { useCallback, useEffect, useState } from "react";
import {
  looksLikeZipBytes,
  ZIP_IMPORT_UNSUPPORTED_PL,
  type Library,
} from "@stagesync/shared";
import {
  createProject,
  deleteProject,
  exportLibraryPack,
  fetchLibrary,
  importLibraryPack,
  updateProject,
} from "@lib/shell-operator/libraryApi.js";
import { errMessage } from "./adminSectionStorage.js";

export function useAdminLibraryActions() {
  const [library, setLibrary] = useState<Library | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [commandPending, setCommandPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [createPromptOpen, setCreatePromptOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const selected = library?.projects.find((p) => p.id === selectedId) ?? null;

  const refreshLibrary = useCallback(async (preferId?: string | null) => {
    const data = await fetchLibrary();
    setLibrary(data);
    setLibraryError(null);
    setSelectedId((prev) => {
      const next =
        preferId !== undefined
          ? preferId
          : prev && data.projects.some((p) => p.id === prev)
            ? prev
            : (data.projects[0]?.id ?? null);
      return next && data.projects.some((p) => p.id === next)
        ? next
        : (data.projects[0]?.id ?? null);
    });
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchLibrary();
        if (cancelled) return;
        setLibrary(data);
        setSelectedId(data.projects[0]?.id ?? null);
      } catch (err) {
        if (!cancelled) {
          setLibraryError(errMessage(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setDraftName(selected?.name ?? "");
  }, [selected?.id, selected?.name]);

  const runMutation = useCallback(
    async (op: () => Promise<void>) => {
      if (commandPending) return;
      setCommandPending(true);
      setActionError(null);
      setActionNotice(null);
      try {
        await op();
      } catch (err) {
        setActionError(errMessage(err));
      } finally {
        setCommandPending(false);
      }
    },
    [commandPending],
  );

  const onCreate = useCallback(() => setCreatePromptOpen(true), []);

  const onDelete = () => {
    if (!selectedId || !selected) return;
    setDeleteConfirmOpen(true);
  };

  const confirmCreate = (raw: string) => {
    setCreatePromptOpen(false);
    void runMutation(async () => {
      const created = await createProject(raw);
      await refreshLibrary(created.id);
    });
  };

  const confirmDelete = () => {
    if (!selectedId) return;
    setDeleteConfirmOpen(false);
    void runMutation(async () => {
      await deleteProject(selectedId);
      const data = await fetchLibrary();
      setLibrary(data);
      setLibraryError(null);
      const nextId = data.projects[0]?.id ?? null;
      setSelectedId(nextId);
    });
  };

  const onRename = () => {
    if (!selectedId) return;
    void runMutation(async () => {
      await updateProject(selectedId, { name: draftName });
      await refreshLibrary(selectedId);
    });
  };

  const onCreateTemplate = () =>
    void runMutation(async () => {
      const p = await createProject(
        `Wzór ${new Date().toLocaleTimeString("pl")}`,
        {
          isTemplate: true,
        },
      );
      await refreshLibrary(p.id);
    });

  const onCreateFromTemplate = (templateId: string) =>
    void runMutation(async () => {
      const p = await createProject(
        `Utwór ${new Date().toLocaleTimeString("pl")}`,
        {
          fromTemplateId: templateId,
        },
      );
      await refreshLibrary(p.id);
    });

  const onExportLibrary = () =>
    void runMutation(async () => {
      const blob = await exportLibraryPack();
      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement("a");
        a.href = url;
        a.download = `stagesync-export-${Date.now()}.stagesync.json`;
        a.rel = "noopener";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } finally {
        URL.revokeObjectURL(url);
      }
      setActionNotice("Wyeksportowano bibliotekę");
    });

  const onImportFile = (file: File) =>
    void runMutation(async () => {
      setActionNotice("Wczytywanie pliku…");
      const buf = await file.arrayBuffer();
      if (buf.byteLength > 16 * 1024 * 1024) {
        throw new Error("Plik importu jest za duży (max 16 MB).");
      }
      if (looksLikeZipBytes(buf)) {
        throw new Error(ZIP_IMPORT_UNSUPPORTED_PL);
      }
      let pack: unknown;
      try {
        pack = JSON.parse(new TextDecoder().decode(buf)) as unknown;
      } catch {
        throw new Error(
          "Nie udało się odczytać JSON. Użyj pakietu v5 (.stagesync.json).",
        );
      }
      setActionNotice("Importowanie…");
      const result = await importLibraryPack(pack);
      setLibrary(result.library);
      const n = result.created.length;
      const noun =
        n === 1
          ? "utwór"
          : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)
            ? "utwory"
            : "utworów";
      setActionNotice(`Zaimportowano ${n} ${noun} z pakietu v5.`);
    });

  return {
    library,
    setLibrary,
    libraryError,
    selectedId,
    setSelectedId,
    selected,
    draftName,
    setDraftName,
    commandPending,
    setCommandPending,
    actionError,
    actionNotice,
    setActionNotice,
    createPromptOpen,
    setCreatePromptOpen,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    templatesOpen,
    setTemplatesOpen,
    refreshLibrary,
    runMutation,
    onCreate,
    onDelete,
    confirmCreate,
    confirmDelete,
    onRename,
    onCreateTemplate,
    onCreateFromTemplate,
    onExportLibrary,
    onImportFile,
  };
}
