import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Button, Input, Select } from "@stagesync/ui";
import { MetaBadge, MetaBadgeRow, ShellToolbar } from "./shared/index.js";
import {
  formatSetDurationMs,
  applyUgImportToProject,
  importUgText,
  placeContentFromForma,
  reflowUgImportSectionBars,
  looksLikeZipBytes,
  resolveFormaClipAt,
  resolveMeterAt,
  ZIP_IMPORT_UNSUPPORTED_PL,
  type Library,
  type Project,
} from "@stagesync/shared";
import {
  batchMidiProgramIds,
  createProject,
  deleteProject,
  exportLibraryPack,
  fetchLibrary,
  fetchProject,
  importLibraryPack,
  putProject,
  updateProject,
} from "../lib/libraryApi.js";
import { uploadProjectMusicXml } from "../lib/projectAssetsApi.js";
import { postSystemRestart, postSystemShutdown } from "../lib/setlistApi.js";
import { prepareHostRestart } from "../lib/desktopBridge.js";
import { syncNavRecentProjects, syncNavTimelineProjectId, toggleAppFullscreen } from "../lib/desktopBridge.js";
import { shouldShowFullscreenControl } from "../lib/nativeShell.js";
import { useAnnounceDevicePresence } from "../lib/useAnnounceDevicePresence.js";
import { useMqMobileCompact } from "../lib/useMqMobileCompact.js";
import { filterAndSortLibrarySongs } from "./admin/filterLibrarySongs.js";
import { pushRecentTimelineProject } from "../lib/lastTimelineProject.js";
import { APP_VERSION } from "../lib/appVersion.js";
import {
  CLOCK_DISPLAY_CHANGED_EVENT,
  formatClockDisplay,
  getStoredClockDisplayFormat,
  type ClockDisplayFormat,
} from "../lib/clockDisplayPrefs.js";
import { openPreferences } from "../lib/preferencesEvents.js";
import { markOperatorSession } from "../lib/operatorSession.js";
import {
  ADMIN_SECTIONS,
  isAdminSectionId,
  type AdminSectionId,
} from "../lib/operatorNavRoutes.js";
import { shouldShowOperatorNav } from "../lib/operatorSurface.js";
import { OperatorNav } from "./components/OperatorNav.js";
import { useTransport } from "../transport/useTransport.js";
import {
  IconFullscreen,
  IconPower,
  IconRestart,
  IconSettings,
  IconTrash,
} from "./icons.js";
import {
  connectionStatusLabel,
} from "./ConnectionIndicator.js";
import { ConnectionLostBanner } from "./ConnectionLostBanner.js";
import {
  SettingsPopover,
  SettingsPopoverAnchor,
} from "./SettingsPopover.js";
import { ShellIconButton } from "./ShellIconButton.js";
import { ShellWordmark } from "./ShellWordmark.js";
import {
  ShellConfirmDialog,
  ShellPromptDialog,
} from "./ShellBlockingDialog.js";
import { ProjectFilesPanel } from "./admin/ProjectFilesPanel.js";
import { AdminAccordionCard } from "./admin/AdminAccordionCard.js";
import { catalogSongBadges, songInspectorMeta } from "./admin/songCatalogBadges.js";
import { SetView } from "./admin/SetView.js";
import { StageView } from "./admin/StageView.js";
import { SystemView } from "./admin/SystemView.js";
import { UgImportForm } from "./UgImportForm.js";
import styles from "./AdminShell.module.css";

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Operacja nie powiodła się";
}


export function AdminShell() {
  useAnnounceDevicePresence();
  const { pathname } = useLocation();
  const isCompactMobile = useMqMobileCompact();
  const [searchParams, setSearchParams] = useSearchParams();
  const [library, setLibrary] = useState<Library | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [section, setSection] = useState<AdminSectionId>("songs");
  const [menuCheckUpdate, setMenuCheckUpdate] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [xmlModalOpen, setXmlModalOpen] = useState(false);
  const [batchPcOpen, setBatchPcOpen] = useState(false);
  const [commandPending, setCommandPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [hostStatusMsg, setHostStatusMsg] = useState<string | null>(null);
  const [createPromptOpen, setCreatePromptOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

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
  const selected = library?.projects.find((p) => p.id === selectedId) ?? null;
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

    // Native menu: StageSync → Sprawdź aktualizacje… (ADR 0010 Phase A)
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
      // Consume query; export runs via DesktopMenuBridge / SongsView button.
      setSection("songs");
      clearAction("songs");
    }
  }, [searchParams, setSearchParams]);

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

  const onCreate = () => {
    setCreatePromptOpen(true);
  };

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

  const timelineProjectId = selectedId ?? state.activeProjectId ?? null;
  const showOperatorNav = isCompactMobile && shouldShowOperatorNav(pathname);

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
      <div className={styles.chromeWrap}>
        <header
          className={[
            styles.chrome,
            isCompactMobile ? styles.chromeCompact : "",
            showOperatorNav ? styles.chromeOperatorNav : styles.chromeLegacy,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {!isCompactMobile ? (
            <div className={styles.chromeBrand}>
              <ShellWordmark suffix="Admin" version={APP_VERSION} />
            </div>
          ) : null}

          {showOperatorNav ? (
            <OperatorNav
              activeApp="admin"
              section={section}
              onSectionChange={setSection}
              className={styles.operatorNavEmbed}
            />
          ) : (
            <>
              {isCompactMobile ? (
                <div className={styles.sectionSelect}>
                  <Select
                    className={styles.sectionSelectInput}
                    value={section}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (isAdminSectionId(v)) {
                        setSection(v);
                      }
                    }}
                    aria-label="Sekcja Admin"
                  >
                    {ADMIN_SECTIONS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : (
                <nav className={styles.sections} aria-label="Sekcje">
                  {ADMIN_SECTIONS.map((item) => (
                    <Button
                      key={item.id}
                      variant="ghost"
                      selected={section === item.id}
                      onClick={() => setSection(item.id)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </nav>
              )}

              <nav
                className={[
                  styles.appJump,
                  isCompactMobile ? styles.appJumpCompact : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-label="Aplikacje"
              >
                {timelineProjectId ? (
                  <Link to={`/timeline/${timelineProjectId}`}>Timeline</Link>
                ) : (
                  <span className={styles.appJumpMuted} aria-disabled>
                    Timeline
                  </span>
                )}
                <Link to="/client">Klient</Link>
              </nav>

              <div className={styles.chromeAside}>
                <ShellIconButton
                  label="Ustawienia"
                  onClick={() => openPreferences("general")}
                >
                  <IconSettings />
                </ShellIconButton>
                {!isCompactMobile ? (
                  <>
                    <ShellIconButton
                      ref={restart.buttonRef}
                      label={restart.label}
                      confirming={restart.pending}
                      onClick={restart.arm}
                    >
                      <IconRestart />
                    </ShellIconButton>
                    <ShellIconButton
                      ref={shutdown.buttonRef}
                      label={shutdown.label}
                      confirming={shutdown.pending}
                      danger
                      onClick={shutdown.arm}
                    >
                      <IconPower />
                    </ShellIconButton>
                    {shouldShowFullscreenControl() ? (
                      <ShellIconButton
                        label="Pełny ekran"
                        onClick={() => void toggleAppFullscreen()}
                      >
                        <IconFullscreen />
                      </ShellIconButton>
                    ) : null}
                  </>
                ) : null}
              </div>
            </>
          )}
        </header>
      </div>

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
            onCreateTemplate={() =>
              void runMutation(async () => {
                const p = await createProject(`Wzór ${new Date().toLocaleTimeString("pl")}`, {
                  isTemplate: true,
                });
                await refreshLibrary(p.id);
              })
            }
            onCreateFromTemplate={(templateId) =>
              void runMutation(async () => {
                const p = await createProject(`Utwór ${new Date().toLocaleTimeString("pl")}`, {
                  fromTemplateId: templateId,
                });
                await refreshLibrary(p.id);
              })
            }
            onExportLibrary={() =>
              void runMutation(async () => {
                const blob = await exportLibraryPack();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `stagesync-export-${Date.now()}.stagesync.json`;
                a.click();
                URL.revokeObjectURL(url);
                setActionNotice("Wyeksportowano bibliotekę");
              })
            }
            onImportFile={(file) =>
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
                    "Nie udało się odczytać JSON. Użyj .stagesync.json (v5) albo legacy database.json.",
                  );
                }
                setActionNotice("Importowanie…");
                const result = await importLibraryPack(pack);
                setLibrary(result.library);
                const n = result.created.length;
                const kind =
                  result.format === "legacy-database"
                    ? "legacy database.json"
                    : "pakietu v5";
                const noun =
                  n === 1
                    ? "utwór"
                    : n % 10 >= 2 &&
                        n % 10 <= 4 &&
                        (n % 100 < 10 || n % 100 >= 20)
                      ? "utwory"
                      : "utworów";
                setActionNotice(`Zaimportowano ${n} ${noun} z ${kind}.`);
              })
            }
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
      </main>

      <footer className={styles.status} aria-label="Status koncertu">
        <div className={styles.statusGroup}>
          <span className={styles.statusLab}>Teraz</span>
          <span
            className={styles.statusVal}
            title={
              selectedId &&
              state.activeProjectId &&
              selectedId !== state.activeProjectId
                ? `Zaznaczony: ${selected?.name ?? "—"}`
                : undefined
            }
          >
            {nowName}
          </span>
        </div>
        <div className={styles.statusGroup}>
          <span className={styles.statusLab}>Sekcja</span>
          <span className={styles.statusVal}>
            {activeSection?.name ?? "—"}
          </span>
        </div>
        <div className={[styles.statusGroup, styles.statusOptional].join(" ")}>
          <span className={styles.statusLab}>Pozycja</span>
          <span className={[styles.statusVal, styles.statusMono].join(" ")}>
            <span>{clockLabel}</span>
            <span className={styles.statusInlineSep} aria-hidden>
              |
            </span>
            <span>{state.bpm} BPM</span>
            <span className={styles.statusInlineSep} aria-hidden>
              |
            </span>
            <span>
              {state.timeSignature.numerator}/{state.timeSignature.denominator}
            </span>
          </span>
        </div>
        <div className={[styles.statusGroup, styles.statusOptional].join(" ")}>
          <span className={styles.statusLab}>Dalej</span>
          <span className={[styles.statusVal, styles.statusMuted].join(" ")}>
            {nextName}
          </span>
        </div>
        <div className={styles.statusGroup}>
          <span className={styles.statusLab}>Połączenie</span>
          <span className={styles.statusVal}>
            {connectionStatusLabel(wsStatus)}
          </span>
        </div>
      </footer>

      {importModalOpen ? (
        <Modal
          title="Importuj Ultimate Guitar"
          onClose={() => {
            setImportModalOpen(false);
          }}
        >
          {!selectedId ? (
            <p className={styles.muted}>Wybierz utwór.</p>
          ) : (
            <UgImportForm
              applyLabel="Importuj do utworu"
              disabled={commandPending}
              applying={commandPending}
              onCancel={() => setImportModalOpen(false)}
              onApply={async ({ text, barsPerLine, sectionBars, runWand }) => {
                if (!selectedId) return;
                setCommandPending(true);
                try {
                  const project = await fetchProject(selectedId);
                  const meter = resolveMeterAt(project, 0);
                  const parsed = importUgText(text, {
                    ppq: project.ppq,
                    meter,
                    barsPerLine,
                  });
                  if (!parsed.ok) {
                    throw new Error(parsed.message);
                  }
                  const reflowed = reflowUgImportSectionBars(parsed, sectionBars, {
                    ppq: project.ppq,
                    meter,
                  });
                  if (!reflowed.ok) {
                    throw new Error(reflowed.message);
                  }
                  let next = applyUgImportToProject(project, reflowed);
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
                } finally {
                  setCommandPending(false);
                }
              }}
            />
          )}
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
        defaultValue="Nowy utwór"
        onConfirm={confirmCreate}
        onCancel={() => setCreatePromptOpen(false)}
      />
      <ShellConfirmDialog
        open={deleteConfirmOpen}
        title="Usuń utwór"
        message={selected ? `Usunąć „${selected.name}”? Tej operacji nie można cofnąć.` : ""}
        confirmLabel="Usuń"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
}

function SongsView({
  library,
  libraryError,
  actionError,
  actionNotice,
  commandPending,
  transportPending,
  selectedId,
  selected,
  draftName,
  templatesOpen = false,
  onTemplatesOpenChange,
  onDraftNameChange,
  onSelect,
  onImport,
  onXml,
  onBatchPc,
  onCreate,
  onCreateTemplate,
  onCreateFromTemplate,
  onExportLibrary,
  onImportFile,
  onDelete,
  onRename,
  onPlay,
}: {
  library: Library | null;
  libraryError: string | null;
  actionError: string | null;
  actionNotice: string | null;
  commandPending: boolean;
  transportPending: boolean;
  selectedId: string | null;
  selected: Library["projects"][number] | null;
  draftName: string;
  templatesOpen?: boolean;
  onTemplatesOpenChange?: (open: boolean) => void;
  onDraftNameChange: (name: string) => void;
  onSelect: (id: string) => void;
  onImport: () => void;
  onXml: () => void;
  onBatchPc: () => void;
  onCreate: () => void;
  onCreateTemplate: () => void;
  onCreateFromTemplate: (templateId: string) => void;
  onExportLibrary: () => void;
  onImportFile: (file: File) => void;
  onDelete: () => void;
  onRename: () => void;
  onPlay: (id: string) => void;
}) {
  const locked = commandPending;
  const nameDirty = Boolean(selected && draftName !== selected.name);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<"library" | "title" | "pc">("library");
  const [dbMenuOpen, setDbMenuOpen] = useState(false);
  const [inspectorProject, setInspectorProject] = useState<Project | null>(null);
  const [openCard, setOpenCard] = useState<"songs" | "inspector">("songs");
  const compactMobile = useMqMobileCompact();
  const dbMenuId = useId();
  const navigate = useNavigate();

  useEffect(() => {
    setInspectorProject(null);
  }, [selectedId]);

  const visibleProjects = useMemo(
    () => filterAndSortLibrarySongs(library?.projects ?? [], filter, sort),
    [library?.projects, filter, sort],
  );

  const templates = useMemo(
    () => (library?.projects ?? []).filter((p) => p.isTemplate),
    [library?.projects],
  );

  const inspectorMeta = useMemo(
    () => (inspectorProject ? songInspectorMeta(inspectorProject) : null),
    [inspectorProject],
  );

  const selectSong = (id: string) => {
    onSelect(id);
    if (compactMobile) setOpenCard("inspector");
  };

  const songsHeadActions = (
    <div className={styles.actions}>
      <SettingsPopoverAnchor>
        <Button
          variant="ghost"
          disabled={locked}
          aria-expanded={dbMenuOpen}
          aria-haspopup="dialog"
          aria-controls={dbMenuOpen ? dbMenuId : undefined}
          onClick={() => setDbMenuOpen((o) => !o)}
        >
          Zarządzaj bazą ▾
        </Button>
        {dbMenuOpen ? (
          <SettingsPopover
            id={dbMenuId}
            title="Baza plików"
            onClose={() => setDbMenuOpen(false)}
          >
            <LibraryFilesCard
              compact
              locked={locked}
              error={actionError}
              notice={actionNotice}
              onOpenImport={() => {
                setDbMenuOpen(false);
                onImport();
              }}
              onExport={onExportLibrary}
              onImportFile={onImportFile}
            />
          </SettingsPopover>
        ) : null}
      </SettingsPopoverAnchor>
    </div>
  );

  const inspectorDesktopHead = selected ? (
    <div className={styles.inspectorHead}>
      <div className={styles.nameRow}>
        <Input
          id="admin-project-name"
          value={draftName}
          maxLength={200}
          disabled={locked}
          aria-label="Nazwa projektu"
          title={selected.id}
          onChange={(e) => onDraftNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && nameDirty && !locked) {
              e.preventDefault();
              onRename();
            }
          }}
        />
        <Button
          variant="primary"
          loading={commandPending}
          disabled={locked || !nameDirty}
          onClick={onRename}
        >
          Zapisz
        </Button>
      </div>
      <p className={styles.inspectorIdQuiet} title={selected.id}>
        ID · {selected.id.slice(0, 8)}…
      </p>
    </div>
  ) : (
    <h2 className={styles.cardTitle}>Wybrany utwór</h2>
  );

  return (
    <div
      className={compactMobile ? styles.accordionStack : styles.split}
      data-admin-mobile={compactMobile ? "1" : undefined}
    >
      <AdminAccordionCard
        id="songs"
        title="Utwory"
        titleAs="h1"
        ariaLabel="Utwory"
        mobile={compactMobile}
        openId={openCard}
        onOpen={setOpenCard}
        headActions={songsHeadActions}
        bodyClassName={[styles.cardBody, styles.cardBodyFill].join(" ")}
      >
          <ShellToolbar>
            <Input
              placeholder="Filtruj…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filtruj utwory"
            />
            <Select
              value={sort}
              onChange={(e) => {
                const v = e.target.value;
                setSort(v === "title" || v === "pc" ? v : "library");
              }}
              aria-label="Sortowanie"
            >
              <option value="library">Kolejność bazy</option>
              <option value="title">Tytuł A–Z</option>
              <option value="pc">Program Change</option>
            </Select>
            <Button
              variant="secondary"
              loading={commandPending}
              disabled={locked}
              onClick={onCreate}
            >
              + Nowy Utwór
            </Button>
            <Button
              variant="ghost"
              disabled={locked}
              aria-label="Numeracja Program Change"
              onClick={onBatchPc}
            >
              Batch PC
            </Button>
          </ShellToolbar>

          {libraryError ? (
            <p className={styles.error} role="alert">
              {libraryError}
            </p>
          ) : null}

          <div className={styles.list}>
            {visibleProjects.map((p) => {
              const badges = catalogSongBadges(p);
              return (
                <button
                  key={p.id}
                  type="button"
                  className={[
                    styles.songRow,
                    selectedId === p.id ? styles.songRowOn : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={locked}
                  onClick={() => selectSong(p.id)}
                >
                  <span className={styles.songPc}>
                    {p.isTemplate ? "wzór" : (p.midiProgramId ?? "—")}
                  </span>
                  <span className={styles.songName}>
                    {p.name}
                    {p.artist?.trim() ? (
                      <span className={styles.songArtist}>
                        {" "}
                        - {p.artist.trim()}
                      </span>
                    ) : null}
                  </span>
                  <MetaBadgeRow
                    aria-label={badges.length > 0 ? badges.join(", ") : undefined}
                  >
                    {badges.map((b, i) => (
                      <MetaBadge key={`${b}-${i}`}>{b}</MetaBadge>
                    ))}
                  </MetaBadgeRow>
                </button>
              );
            })}
            {!library && !libraryError ? (
              <p className={styles.muted} role="status" aria-live="polite">Wczytywanie…</p>
            ) : null}
            {library && visibleProjects.length === 0 ? (
              <p className={styles.muted} role="status" aria-live="polite">Brak utworów dla filtra.</p>
            ) : null}
          </div>

          <details
            className={styles.templates}
            open={templatesOpen}
            onToggle={(e) => {
              onTemplatesOpenChange?.(e.currentTarget.open);
            }}
          >
            <summary className={styles.templatesSummary}>
              Wzory ({templates.length})
            </summary>
            {templates.length === 0 ? (
              <p className={styles.muted}>
                Brak wzorów.{" "}
                <button
                  type="button"
                  className={styles.editLink}
                  disabled={locked}
                  onClick={onCreateTemplate}
                >
                  Utwórz wzór
                </button>
              </p>
            ) : (
              <ul className={styles.templatesList}>
                {templates.map((t) => (
                  <li
                    key={t.id}
                    className={[styles.songRow, styles.songRowPair].join(" ")}
                  >
                    <span className={styles.songName}>{t.name}</span>
                    <Button
                      variant="secondary"
                      disabled={locked}
                      aria-label={`Nowy z wzoru: ${t.name}`}
                      onClick={() => onCreateFromTemplate(t.id)}
                    >
                      Nowy z wzoru
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </details>
      </AdminAccordionCard>

      <AdminAccordionCard
        id="inspector"
        title={selected ? draftName || selected.name : "Wybrany utwór"}
        ariaLabel="Wybrany utwór"
        mobile={compactMobile}
        openId={openCard}
        onOpen={setOpenCard}
        desktopHead={inspectorDesktopHead}
      >
          {compactMobile && selected ? (
            <div className={styles.inspectorHead}>
              <div className={styles.nameRow}>
                <Input
                  id="admin-project-name-mobile"
                  value={draftName}
                  maxLength={200}
                  disabled={locked}
                  aria-label="Nazwa projektu"
                  title={selected.id}
                  onChange={(e) => onDraftNameChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && nameDirty && !locked) {
                      e.preventDefault();
                      onRename();
                    }
                  }}
                />
                <Button
                  variant="primary"
                  loading={commandPending}
                  disabled={locked || !nameDirty}
                  onClick={onRename}
                >
                  Zapisz
                </Button>
              </div>
              <p className={styles.inspectorIdQuiet} title={selected.id}>
                ID · {selected.id.slice(0, 8)}…
              </p>
            </div>
          ) : null}
          {selected ? (
            <div className={styles.inspectorStack}>
              <div className={styles.inspectorPrimary}>
                <Button
                  variant="secondary"
                  disabled={!selectedId || commandPending || transportPending}
                  loading={transportPending}
                  onClick={() => selectedId && onPlay(selectedId)}
                >
                  Odtwórz
                </Button>
                <Button
                  variant="primary"
                  disabled={locked}
                  aria-label="Otwórz w Timeline"
                  onClick={() => navigate(`/timeline/${selected.id}`)}
                >
                  Timeline
                </Button>
                <ShellIconButton
                  label="Usuń utwór"
                  danger
                  disabled={locked}
                  className={styles.inspectorDelete}
                  onClick={onDelete}
                >
                  <IconTrash />
                </ShellIconButton>
              </div>
              <div className={styles.songMetaBlock}>
                <dl className={styles.songMetaGrid} aria-label="Metadane utworu">
                  <div className={styles.songMetaCell}>
                    <dt>Tonacja</dt>
                    <dd>{inspectorMeta?.keyLabel ?? "—"}</dd>
                  </div>
                  <div className={styles.songMetaCell}>
                    <dt>Tempo</dt>
                    <dd>
                      {inspectorMeta?.bpm != null
                        ? `${Math.round(inspectorMeta.bpm)} BPM`
                        : selected.defaultBpm != null
                          ? `${Math.round(selected.defaultBpm)} BPM`
                          : "—"}
                    </dd>
                  </div>
                  <div className={styles.songMetaCell}>
                    <dt>Czas</dt>
                    <dd>
                      {inspectorMeta?.durationLabel ??
                        (selected.durationMs != null && selected.durationMs > 0
                          ? formatSetDurationMs(selected.durationMs)
                          : "—")}
                    </dd>
                  </div>
                </dl>
                <div className={styles.songMetaActions}>
                  <Button
                    variant="ghost"
                    disabled={locked || !selected.hasMusicXml}
                    title={
                      selected.hasMusicXml
                        ? "Ma MusicXML"
                        : "Brak MusicXML — użyj XML"
                    }
                    aria-label={
                      selected.hasMusicXml
                        ? "Partytura — ma MusicXML"
                        : "Partytura — brak MusicXML, użyj XML"
                    }
                    onClick={onXml}
                  >
                    Partytura
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={locked}
                    aria-label="Import MusicXML"
                    title="Import MusicXML"
                    onClick={onXml}
                  >
                    XML
                  </Button>
                </div>
              </div>
              <ProjectFilesPanel
                projectId={selectedId}
                locked={locked}
                onProjectLoaded={setInspectorProject}
              />
            </div>
          ) : (
            <p className={styles.muted}>Wybierz utwór z listy.</p>
          )}
      </AdminAccordionCard>
    </div>
  );
}

function LibraryFilesCard({
  onOpenImport,
  onExport,
  onImportFile,
  locked,
  error,
  notice,
  compact = false,
}: {
  onOpenImport: () => void;
  onExport: () => void;
  onImportFile: (file: File) => void;
  locked?: boolean;
  error?: string | null;
  notice?: string | null;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const body = (
    <>
      <div
        className={compact ? styles.dropZoneCompact : styles.dropZone}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) onImportFile(f);
        }}
      >
        Upuść .stagesync.json (v5) albo legacy database.json
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".json,.stagesync.json,application/json,.zip,.stagesync"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImportFile(f);
          e.target.value = "";
        }}
      />
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {notice && !error ? (
        <p className={styles.muted} role="status" aria-live="polite">
          {notice}
        </p>
      ) : null}
      {!compact ? (
        <p className={styles.muted}>
          Archiwa ZIP / binarne .stagesync — na razie niewspierane (tylko JSON).
        </p>
      ) : null}
      <div className={styles.actions}>
        <Button
          variant="secondary"
          disabled={locked}
          loading={locked}
          onClick={() => inputRef.current?.click()}
        >
          Z pliku…
        </Button>
        <Button variant="ghost" disabled={locked} onClick={onOpenImport}>
          Import UG
        </Button>
        <Button variant="ghost" disabled={locked} onClick={onExport}>
          Eksport
        </Button>
      </div>
    </>
  );

  if (compact) {
    return (
      <div
        className={styles.dbManageBody}
        role="region"
        aria-label="Pliki bazy"
      >
        {body}
      </div>
    );
  }

  return (
    <section className={styles.card} aria-label="Pliki">
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle}>Pliki</h2>
      </div>
      <div className={styles.cardBody}>{body}</div>
    </section>
  );
}

function useDoubleConfirm(action: () => Promise<void>, label: string) {
  const [pending, setPending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const cancel = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setPending(false);
  }, []);

  const arm = useCallback(() => {
    if (pending) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      setPending(false);
      void action();
      return;
    }
    setPending(true);
    timerRef.current = setTimeout(() => setPending(false), 4000);
  }, [action, pending]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!pending) return;
    let remove: (() => void) | undefined;
    const attachId = window.setTimeout(() => {
      const onDocClick = (event: MouseEvent) => {
        const el = buttonRef.current;
        if (el && event.target instanceof Node && el.contains(event.target)) {
          return;
        }
        cancel();
      };
      document.addEventListener("click", onDocClick);
      remove = () => document.removeEventListener("click", onDocClick);
    }, 0);
    return () => {
      window.clearTimeout(attachId);
      remove?.();
    };
  }, [pending, cancel]);

  return {
    pending,
    arm,
    buttonRef,
    label: pending ? `Potwierdź ${label}` : label,
  };
}

function MusicXmlModal({
  projectId,
  projectName,
  onClose,
  onUploaded,
}: {
  projectId: string | null;
  projectName: string | null;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Modal title="Importuj MusicXML" onClose={onClose}>
      {!projectId ? (
        <p className={styles.muted}>Wybierz utwór.</p>
      ) : (
        <>
          <p className={styles.muted}>
            {projectName ?? projectId}
          </p>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept=".musicxml,.xml,.mxl,application/xml,text/xml"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file || !projectId) return;
              void (async () => {
                setBusy(true);
                setError(null);
                try {
                  await uploadProjectMusicXml(projectId, file);
                  onUploaded();
                  onClose();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Przesyłanie nieudane");
                } finally {
                  setBusy(false);
                }
              })();
            }}
          />
        </>
      )}
      <div className={styles.actions}>
        <Button variant="ghost" onClick={onClose}>
          Anuluj
        </Button>
        <Button
          variant="primary"
          disabled={!projectId || busy}
          loading={busy}
          onClick={() => inputRef.current?.click()}
        >
          Wybierz plik…
        </Button>
      </div>
    </Modal>
  );
}

function BatchPcModal({
  library,
  onClose,
  onSaved,
}: {
  library: Library | null;
  onClose: () => void;
  onSaved: (library: Library) => void | Promise<void>;
}) {
  const playable = (library?.projects ?? []).filter((p) => p.isTemplate !== true);
  const [draft, setDraft] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const p of playable) {
      init[p.id] = p.midiProgramId ?? 0;
    }
    return init;
  });
  const [start, setStart] = useState(playable[0]?.midiProgramId ?? 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const renumber = () => {
    const next = { ...draft };
    let pc = Math.max(0, Math.min(127, Math.round(start)));
    for (const p of playable) {
      next[p.id] = pc;
      pc = Math.min(127, pc + 1);
    }
    setDraft(next);
  };

  return (
    <Modal title="Numeracja Program Change" onClose={onClose}>
      <p className={styles.muted}>
        Numeracja Program Change (0–127) dla utworów (bez wzorów).
      </p>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <label className={styles.field}>
        Start Program Change
        <Input
          type="number"
          min={0}
          max={127}
          value={start}
          onChange={(e) => setStart(Number(e.target.value))}
        />
      </label>
      <Button variant="secondary" onClick={renumber}>
        Numeruj od startu
      </Button>
      <ul className={styles.list}>
        {playable.map((p) => (
          <li
            key={p.id}
            className={[styles.songRow, styles.songRowPair].join(" ")}
          >
            <span className={styles.songName}>{p.name}</span>
            <Input
              type="number"
              min={0}
              max={127}
              value={draft[p.id] ?? 0}
              aria-label={`PC ${p.name}`}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  [p.id]: Math.max(0, Math.min(127, Number(e.target.value))),
                }))
              }
            />
          </li>
        ))}
      </ul>
      <div className={styles.actions}>
        <Button variant="ghost" onClick={onClose}>
          Anuluj
        </Button>
        <Button
          variant="primary"
          loading={busy}
          disabled={busy || playable.length === 0}
          onClick={() => {
            void (async () => {
              setBusy(true);
              setError(null);
              try {
                const assignments = playable.map((p) => ({
                  id: p.id,
                  midiProgramId: draft[p.id] ?? 0,
                }));
                const next = await batchMidiProgramIds(assignments);
                await onSaved(next);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Zapis PC nieudany");
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          Zapisz
        </Button>
      </div>
    </Modal>
  );
}


function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const titleId = useId();
  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Zamknij"
        onClick={onClose}
      />
      <div className={styles.modalPanel}>
        <div className={styles.modalHead}>
          <h2 id={titleId}>{title}</h2>
          <ShellIconButton label="Zamknij" onClick={onClose}>
            ×
          </ShellIconButton>
        </div>
        {children}
      </div>
    </div>
  );
}
