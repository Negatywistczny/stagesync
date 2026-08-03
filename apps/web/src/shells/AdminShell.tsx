import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Button, Select } from "@stagesync/ui";
import {
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
  createProject,
  deleteProject,
  exportLibraryPack,
  fetchLibrary,
  fetchProject,
  importLibraryPack,
  putProject,
  updateProject,
} from "../lib/libraryApi.js";
import { postSystemRestart, postSystemShutdown } from "../lib/setlistApi.js";
import { prepareHostRestart } from "../lib/desktopBridge.js";
import { syncNavRecentProjects, syncNavTimelineProjectId, toggleAppFullscreen } from "../lib/desktopBridge.js";
import { useAnnounceDevicePresence } from "../lib/useAnnounceDevicePresence.js";
import { useMqMobileCompact } from "../lib/useMqMobileCompact.js";
import { useMqTablet } from "../lib/useMqTablet.js";
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
import {
  isOsMenuDesktopShell,
  shouldShowFullscreenControl,
  shouldShowOperatorNav,
} from "../lib/operatorSurface.js";
import { OperatorNav } from "./components/OperatorNav.js";
import { useTransport } from "../transport/useTransport.js";
import {
  IconFullscreen,
  IconPower,
  IconRestart,
  IconSettings,
} from "./icons.js";
import {
  connectionStatusLabel,
} from "./ConnectionIndicator.js";
import { ConnectionLostBanner } from "./ConnectionLostBanner.js";
import { ShellIconButton } from "./ShellIconButton.js";
import { ShellWordmark } from "./ShellWordmark.js";
import {
  ShellConfirmDialog,
  ShellPromptDialog,
} from "./ShellBlockingDialog.js";
import { SetView } from "./admin/SetView.js";
import { StageView } from "./admin/StageView.js";
import { SystemView } from "./admin/SystemView.js";
import { UgImportForm } from "./UgImportForm.js";
import { Modal } from "./admin/modals/Modal.js";
import { MusicXmlModal } from "./admin/modals/MusicXmlModal.js";
import { BatchPcModal } from "./admin/modals/BatchPcModal.js";
import { SongsView } from "./admin/views/SongsView.js";
import styles from "./AdminShell.module.css";

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Operacja nie powiodła się";
}


export function AdminShell() {
  useAnnounceDevicePresence();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isCompactMobile = useMqMobileCompact();
  const isTablet = useMqTablet();
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

  const fullscreenButton = shouldShowFullscreenControl() ? (
    <ShellIconButton
      label="Pełny ekran"
      onClick={() => void toggleAppFullscreen()}
    >
      <IconFullscreen />
    </ShellIconButton>
  ) : null;

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
          {!isCompactMobile && !isOsMenuDesktopShell() ? (
            <div className={styles.chromeBrand}>
              <ShellWordmark
                suffix="Admin"
                version={APP_VERSION}
                iconOnly={isTablet}
                onClick={() => navigate("/")}
                title="Wróć do wyboru hosta"
              />
            </div>
          ) : null}

          {showOperatorNav ? (
            <OperatorNav
              activeApp="admin"
              section={section}
              onSectionChange={setSection}
              className={styles.operatorNavEmbed}
              trailing={fullscreenButton}
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
                  </>
                ) : null}
                {fullscreenButton}
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
              initialTitle={selected?.name}
              initialArtist={selected?.artist}
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
