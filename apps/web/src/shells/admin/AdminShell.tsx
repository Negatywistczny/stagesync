import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import {
  getWorkingTitle,
  resolveFormaClipAt,
  resolveMeterAt,
  type Project,
} from "@stagesync/shared";
import { fetchProject } from "@lib/shell-operator/libraryApi.js";
import {
  postSystemRestart,
  postSystemShutdown,
} from "@lib/shell-operator/setlistApi.js";
import {
  prepareHostRestart,
  syncNavRecentProjects,
  syncNavTimelineProjectId,
} from "@lib/client/desktopBridge.js";
import { useMqMobileCompact } from "@lib/client/useMqMobileCompact.js";
import { useMqTablet } from "@lib/client/useMqTablet.js";
import { pushRecentTimelineProject } from "@lib/client/lastTimelineProject.js";
import {
  CLOCK_DISPLAY_CHANGED_EVENT,
  formatClockDisplay,
  getStoredClockDisplayFormat,
  type ClockDisplayFormat,
} from "@lib/client/clockDisplayPrefs.js";
import { markOperatorSession } from "@lib/shell-operator/operatorSession.js";
import {
  isAdminSectionId,
  type AdminSectionId,
} from "@lib/shell-operator/operatorNavRoutes.js";
import { ConnectionLostBanner } from "../client/ConnectionLostBanner.js";
import {
  ShellConfirmDialog,
  ShellPromptDialog,
} from "../components/ShellBlockingDialog.js";
import { SetView } from "./SetView.js";
import { StageView } from "./StageView.js";
import { SystemView } from "./SystemView.js";
import { DevView } from "./DevView.js";
import { SongImportWizard } from "../import/SongImportWizard.js";
import { Modal } from "./modals/Modal.js";
import { MusicXmlModal } from "./modals/MusicXmlModal.js";
import { BatchPcModal } from "./modals/BatchPcModal.js";
import { SongsView } from "./views/SongsView.js";
import { useDoubleConfirm } from "./useDoubleConfirm.js";
import { AdminFooter } from "./AdminFooter.js";
import { useAdminImportHandlers } from "./useAdminImportHandlers.js";
import { AdminShellChrome } from "./AdminShellChrome.js";
import {
  ADMIN_LAST_SECTION_KEY,
  readStoredAdminSection,
} from "./adminSectionStorage.js";
import { useAdminLibraryActions } from "./useAdminLibraryActions.js";
import { useTransport } from "../../transport/useTransport.js";
import styles from "./AdminShell.module.css";

export function AdminShell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isCompactMobile = useMqMobileCompact();
  const isTablet = useMqTablet();
  const [searchParams, setSearchParams] = useSearchParams();
  const [section, setSection] = useState<AdminSectionId>(() =>
    readStoredAdminSection(),
  );
  const [menuCheckUpdate, setMenuCheckUpdate] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [xmlModalOpen, setXmlModalOpen] = useState(false);
  const [batchPcOpen, setBatchPcOpen] = useState(false);
  const [hostStatusMsg, setHostStatusMsg] = useState<string | null>(null);

  const {
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
    onCreate,
    onDelete,
    confirmCreate,
    confirmDelete,
    onRename,
    onCreateTemplate,
    onCreateFromTemplate,
    onExportLibrary,
    onImportFile,
  } = useAdminLibraryActions();

  const restart = useDoubleConfirm(async () => {
    setHostStatusMsg("Restart serwera…");
    try {
      await prepareHostRestart();
      await postSystemRestart();
    } catch (err) {
      setHostStatusMsg(err instanceof Error ? err.message : "Restart nieudany");
    }
  }, "Restart");

  const shutdown = useDoubleConfirm(async () => {
    setHostStatusMsg("Wyłączanie serwera…");
    try {
      await postSystemShutdown();
    } catch (err) {
      setHostStatusMsg(
        err instanceof Error ? err.message : "Wyłączenie nieudane",
      );
    }
  }, "Wyłącz");

  const {
    state,
    displayTicks,
    wsStatus,
    play,
    commandPending: transportPending,
    setlistSnapshot,
  } = useTransport();
  const [clockFormat, setClockFormat] = useState<ClockDisplayFormat>(() =>
    getStoredClockDisplayFormat(),
  );
  const clockLabel = formatClockDisplay({
    ticks: displayTicks,
    bpm: state.bpm,
    timeSignature: state.timeSignature,
    ppq: state.ppq,
    format: clockFormat,
  });
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  const sectionProjectId = state.activeProjectId ?? selectedId;
  const activeSection = activeProject
    ? resolveFormaClipAt(activeProject, displayTicks)
    : null;
  const nowProject =
    library?.projects.find((p) => p.id === state.activeProjectId) ?? null;
  const nowName = nowProject?.name ?? "—";
  const nextName = setlistSnapshot.enabled
    ? (setlistSnapshot.next?.name ??
      (setlistSnapshot.currentIndex >= 0 ? "Koniec setu" : "—"))
    : "z setu";

  useEffect(() => {
    const onClock = () => {
      setClockFormat(getStoredClockDisplayFormat());
    };
    window.addEventListener(CLOCK_DISPLAY_CHANGED_EVENT, onClock);
    return () => {
      window.removeEventListener(CLOCK_DISPLAY_CHANGED_EVENT, onClock);
    };
  }, []);

  useEffect(() => {
    markOperatorSession();
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(ADMIN_LAST_SECTION_KEY, section);
    } catch {
      /* storage unavailable (private mode etc.) */
    }
  }, [section]);

  useEffect(() => {
    const sectionParam = searchParams.get("section");
    if (sectionParam && isAdminSectionId(sectionParam)) {
      setSection(sectionParam);
    }
    const action = searchParams.get("action");
    if (!action) return;

    const clearAction = (fallbackSection?: AdminSectionId) => {
      const next = new URLSearchParams(searchParams);
      next.delete("action");
      if (fallbackSection && !next.get("section")) {
        next.set("section", fallbackSection);
      }
      setSearchParams(next, { replace: true });
    };

    if (action === "check-update") {
      setSection("host");
      setMenuCheckUpdate(true);
      clearAction("host");
      return;
    }
    if (action === "from-template") {
      setSection("songs");
      setTemplatesOpen(true);
      setActionNotice("Wybierz wzór w sekcji Wzory poniżej.");
      clearAction("songs");
      return;
    }
    if (action === "new") {
      setSection("songs");
      setCreatePromptOpen(true);
      clearAction("songs");
      return;
    }
    if (action === "import") {
      setSection("songs");
      setImportModalOpen(true);
      clearAction("songs");
      return;
    }
    if (action === "export") {
      setSection("songs");
      clearAction("songs");
    }
  }, [
    searchParams,
    setSearchParams,
    setActionNotice,
    setCreatePromptOpen,
    setTemplatesOpen,
  ]);

  useEffect(() => {
    if (!sectionProjectId) {
      setActiveProject(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const project = await fetchProject(sectionProjectId);
        if (!cancelled) setActiveProject(project);
      } catch {
        if (!cancelled) setActiveProject(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sectionProjectId, state.activeProjectId, displayTicks]);

  const { onApplyUg, onApplyUltrastar, onApplyUsUg } = useAdminImportHandlers({
    selectedId,
    setCommandPending,
    setImportModalOpen,
    setActionNotice,
    refreshLibrary,
  });

  const timelineProjectId = selectedId ?? state.activeProjectId ?? null;

  useEffect(() => {
    if (!timelineProjectId) return;
    const name =
      library?.projects.find((p) => p.id === timelineProjectId)?.name ??
      timelineProjectId;
    const recent = pushRecentTimelineProject(timelineProjectId, name);
    void syncNavTimelineProjectId(timelineProjectId);
    void syncNavRecentProjects(recent);
  }, [timelineProjectId, library]);

  return (
    <div className={styles.shell}>
      <ConnectionLostBanner status={wsStatus} />
      <AdminShellChrome
        pathname={pathname}
        isCompactMobile={isCompactMobile}
        isTablet={isTablet}
        section={section}
        onSectionChange={setSection}
        timelineProjectId={timelineProjectId}
        onNavigateHome={() => navigate("/")}
        restart={restart}
        shutdown={shutdown}
      />

      <main className={styles.workspace}>
        {section === "songs" ? (
          <SongsView
            library={library}
            libraryError={libraryError}
            actionError={actionError}
            actionNotice={actionNotice}
            commandPending={commandPending}
            transportPending={transportPending}
            selectedId={selectedId}
            selected={selected}
            draftName={draftName}
            templatesOpen={templatesOpen}
            onTemplatesOpenChange={setTemplatesOpen}
            onDraftNameChange={setDraftName}
            onSelect={setSelectedId}
            onImport={() => setImportModalOpen(true)}
            onXml={() => setXmlModalOpen(true)}
            onBatchPc={() => setBatchPcOpen(true)}
            onCreate={onCreate}
            onCreateTemplate={onCreateTemplate}
            onCreateFromTemplate={onCreateFromTemplate}
            onExportLibrary={onExportLibrary}
            onImportFile={onImportFile}
            onDelete={onDelete}
            onRename={onRename}
            onPlay={(id) => void play({ projectId: id })}
          />
        ) : null}
        {section === "set" ? (
          <SetView library={library} selectedId={selectedId} />
        ) : null}
        {section === "stage" ? <StageView /> : null}
        {section === "host" ? (
          <SystemView
            statusMsg={hostStatusMsg}
            autoCheckUpdate={menuCheckUpdate}
            onAutoCheckUpdateConsumed={() => setMenuCheckUpdate(false)}
          />
        ) : null}
        {section === "dev" ? import.meta.env.DEV ? <DevView /> : null : null}
      </main>

      <AdminFooter
        nowName={nowName}
        nextName={nextName}
        selectedId={selectedId}
        activeProjectId={state.activeProjectId}
        selectedName={selected?.name}
        activeSection={activeSection}
        clockLabel={clockLabel}
        bpm={state.bpm}
        timeSignature={state.timeSignature}
        wsStatus={wsStatus}
      />

      {importModalOpen ? (
        <Modal
          title={
            selectedId
              ? "Importuj utwór — nadpisz zaznaczony"
              : "Importuj utwór — nowy"
          }
          wide
          onClose={() => {
            setImportModalOpen(false);
          }}
        >
          <SongImportWizard
            applyLabel={selectedId ? "Importuj do utworu" : "Utwórz nowy utwór"}
            disabled={commandPending}
            applying={commandPending}
            projectId={selectedId ?? undefined}
            initialTitle={selected?.name}
            initialArtist={selected?.artist}
            importOptions={
              selectedId && activeProject
                ? {
                    ppq: activeProject.ppq,
                    meter: resolveMeterAt(activeProject, 0),
                  }
                : undefined
            }
            onCancel={() => setImportModalOpen(false)}
            onApplyUg={onApplyUg}
            onApplyUltrastar={onApplyUltrastar}
            onApplyUsUg={onApplyUsUg}
          />
        </Modal>
      ) : null}

      {xmlModalOpen ? (
        <MusicXmlModal
          projectId={selectedId}
          projectName={selected?.name ?? null}
          onClose={() => setXmlModalOpen(false)}
          onUploaded={() => void refreshLibrary(selectedId)}
        />
      ) : null}

      {batchPcOpen ? (
        <BatchPcModal
          library={library}
          onClose={() => setBatchPcOpen(false)}
          onSaved={async (next) => {
            setLibrary(next);
            setBatchPcOpen(false);
          }}
        />
      ) : null}

      <ShellPromptDialog
        open={createPromptOpen}
        title="Nowy utwór"
        label="Nazwa projektu"
        defaultValue={getWorkingTitle()}
        onConfirm={confirmCreate}
        onCancel={() => setCreatePromptOpen(false)}
      />
      <ShellConfirmDialog
        open={deleteConfirmOpen}
        title="Usuń utwór"
        message={
          selected
            ? `Usunąć „${selected.name}”? Tej operacji nie można cofnąć.`
            : ""
        }
        confirmLabel="Usuń"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
}
