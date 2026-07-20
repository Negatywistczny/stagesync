import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@stagesync/ui";
import {
  importUgText,
  looksLikeZipBytes,
  resolveFormaClipAt,
  resolveMeterAt,
  ticksToBbt,
  toDisplayBar,
  ZIP_IMPORT_UNSUPPORTED_PL,
  type Library,
  type Project,
  type SetlistView,
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
import { fetchSetlist, clearHostLogs, fetchNetworkInfo, postSystemRestart, postSystemShutdown, type HostLogLine, type NetworkInfo } from "../lib/setlistApi.js";
import { APP_VERSION } from "../lib/appVersion.js";
import { useTransport } from "../transport/useTransport.js";
import { IconFullscreen, IconPower, IconRestart, IconSettings, IconSun } from "./icons.js";
import {
  connectionStatusLabel,
} from "./ConnectionIndicator.js";
import {
  SettingsPopover,
  ShellAppearanceFields,
} from "./SettingsPopover.js";
import { ShellIconButton } from "./ShellIconButton.js";
import { ShellWordmark } from "./ShellWordmark.js";
import { ProjectFilesPanel } from "./admin/ProjectFilesPanel.js";
import { SetView } from "./admin/SetView.js";
import { StageView } from "./admin/StageView.js";
import styles from "./AdminShell.module.css";

type SectionId = "songs" | "set" | "stage" | "host";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "songs", label: "Utwory" },
  { id: "set", label: "Set" },
  { id: "stage", label: "Scena" },
  { id: "host", label: "Host" },
];

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Operacja nie powiodła się";
}

export function AdminShell() {
  const [library, setLibrary] = useState<Library | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [section, setSection] = useState<SectionId>("songs");
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [ugText, setUgText] = useState("");
  const [ugError, setUgError] = useState<string | null>(null);
  const [xmlModalOpen, setXmlModalOpen] = useState(false);
  const [batchPcOpen, setBatchPcOpen] = useState(false);
  const [pathPickerOpen, setPathPickerOpen] = useState(false);
  const [commandPending, setCommandPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [hostStatusMsg, setHostStatusMsg] = useState<string | null>(null);

  const restart = useDoubleConfirm(async () => {
    setHostStatusMsg("Restart serwera…");
    try {
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

  const { state, displayTicks, wsStatus, play } = useTransport();
  const bbt = ticksToBbt(displayTicks, state.timeSignature, state.ppq);
  const selected = library?.projects.find((p) => p.id === selectedId) ?? null;
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [setlistView, setSetlistView] = useState<SetlistView | null>(null);

  const sectionProjectId = state.activeProjectId ?? selectedId;
  const activeSection = activeProject
    ? resolveFormaClipAt(activeProject, displayTicks)
    : null;
  const nowProject =
    library?.projects.find((p) => p.id === state.activeProjectId) ?? null;
  const nowName = nowProject?.name ?? "—";
  const nextName = setlistView?.enabled
    ? (setlistView.next?.name ?? (setlistView.currentIndex >= 0 ? "Koniec setu" : "—"))
    : "z setu";

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const view = await fetchSetlist();
        if (!cancelled) setSetlistView(view);
      } catch {
        if (!cancelled) setSetlistView(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.activeProjectId, section]);

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
    const raw = window.prompt("Nazwa nowego projektu");
    if (raw === null) return;
    void runMutation(async () => {
      const created = await createProject(raw);
      await refreshLibrary(created.id);
    });
  };

  const onDelete = () => {
    if (!selectedId || !selected) return;
    if (!window.confirm(`Usunąć „${selected.name}”?`)) return;
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

  return (
    <div className={styles.shell}>
      <div className={styles.chromeWrap}>
        <header className={styles.chrome}>
          <ShellWordmark suffix="Admin" version={APP_VERSION} />

          <nav className={styles.sections} aria-label="Sekcje">
            {SECTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={[
                  styles.sectionTab,
                  section === item.id ? styles.sectionTabOn : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={section === item.id}
                onClick={() => setSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className={styles.chromeAside}>
            <nav className={styles.appJump} aria-label="Aplikacje">
              <Link to={selectedId ? `/timeline/${selectedId}` : "#"} aria-disabled={!selectedId}>
                Timeline
              </Link>
              <Link to="/">Klient</Link>
            </nav>
            <ShellIconButton
              label="Wygląd"
              aria-expanded={appearanceOpen}
              onClick={() => setAppearanceOpen((v) => !v)}
            >
              <IconSun />
            </ShellIconButton>
            <ShellIconButton
              label="Ustawienia hosta"
              onClick={() => setSettingsOpen(true)}
            >
              <IconSettings />
            </ShellIconButton>
            <ShellIconButton
              label={restart.label}
              pressed={restart.pending}
              onClick={restart.arm}
            >
              <IconRestart />
            </ShellIconButton>
            <ShellIconButton
              label={shutdown.label}
              pressed={shutdown.pending}
              onClick={shutdown.arm}
            >
              <IconPower />
            </ShellIconButton>
            <ShellIconButton
              label="Pełny ekran"
              onClick={() => {
                void (async () => {
                  try {
                    if (!document.fullscreenElement) {
                      await document.documentElement.requestFullscreen();
                    } else {
                      await document.exitFullscreen();
                    }
                  } catch {
                    /* ignore */
                  }
                })();
              }}
            >
              <IconFullscreen />
            </ShellIconButton>
          </div>
        </header>

        {appearanceOpen ? (
          <SettingsPopover
            title="Wygląd"
            placement="fixed-top-right"
            onClose={() => setAppearanceOpen(false)}
          >
            <ShellAppearanceFields />
          </SettingsPopover>
        ) : null}
      </div>

      <main className={styles.workspace}>
        {section === "songs" ? (
          <SongsView
            library={library}
            libraryError={libraryError}
            actionError={actionError}
            actionNotice={actionNotice}
            commandPending={commandPending}
            selectedId={selectedId}
            selected={selected}
            draftName={draftName}
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
          <HostView
            statusMsg={hostStatusMsg}
            onPathPicker={() => setPathPickerOpen(true)}
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
        <div className={styles.statusGroup}>
          <span className={styles.statusLab}>Pozycja</span>
          <span className={[styles.statusVal, styles.statusMono].join(" ")}>
            {toDisplayBar(bbt.bar)}.{bbt.beat} · {state.bpm} BPM ·{" "}
            {state.timeSignature.numerator}/{state.timeSignature.denominator}
          </span>
        </div>
        <div className={styles.statusGroup}>
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

      {settingsOpen ? (
        <HostSettingsModal
          onClose={() => setSettingsOpen(false)}
          onPathPicker={() => setPathPickerOpen(true)}
        />
      ) : null}

      {importModalOpen ? (
        <Modal
          title="Import Ultimate Guitar"
          onClose={() => {
            setImportModalOpen(false);
            setUgError(null);
          }}
        >
          {!selectedId ? (
            <p className={styles.muted}>Wybierz utwór.</p>
          ) : (
            <>
              <p className={styles.muted}>
                Nadpisze lane Tekst i Akordy w „{selected?.name ?? selectedId}”.
              </p>
              {ugError ? (
                <p className={styles.error} role="alert">
                  {ugError}
                </p>
              ) : null}
              <textarea
                className={styles.textarea}
                rows={10}
                value={ugText}
                aria-label="Tekst UG"
                placeholder={"[C]Hello [G]world"}
                disabled={commandPending}
                onChange={(e) => setUgText(e.target.value)}
              />
            </>
          )}
          <div className={styles.actions}>
            <Button
              variant="ghost"
              onClick={() => {
                setImportModalOpen(false);
                setUgError(null);
              }}
            >
              Anuluj
            </Button>
            <Button
              variant="primary"
              disabled={!selectedId || commandPending || !ugText.trim()}
              loading={commandPending}
              onClick={() => {
                void (async () => {
                  if (!selectedId) return;
                  setCommandPending(true);
                  setUgError(null);
                  try {
                    const project = await fetchProject(selectedId);
                    const result = importUgText(ugText, {
                      ppq: project.ppq,
                      meter: resolveMeterAt(project, 0),
                    });
                    if (!result.ok) {
                      setUgError(result.message);
                      return;
                    }
                    await putProject(selectedId, {
                      ...project,
                      tekst: result.tekst,
                      akordy: result.akordy,
                    });
                    setImportModalOpen(false);
                    setUgText("");
                    await refreshLibrary(selectedId);
                  } catch (err) {
                    setUgError(errMessage(err));
                  } finally {
                    setCommandPending(false);
                  }
                })();
              }}
            >
              Importuj do utworu
            </Button>
          </div>
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

      {pathPickerOpen ? (
        <Modal title="Ścieżka" onClose={() => setPathPickerOpen(false)}>
          <p className={styles.muted}>Przeglądanie katalogów — shell.</p>
          <Button variant="ghost" onClick={() => setPathPickerOpen(false)}>
            Zamknij
          </Button>
        </Modal>
      ) : null}
    </div>
  );
}

function SongsView({
  library,
  libraryError,
  actionError,
  actionNotice,
  commandPending,
  selectedId,
  selected,
  draftName,
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
  selectedId: string | null;
  selected: Library["projects"][number] | null;
  draftName: string;
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

  const visibleProjects = useMemo(() => {
    const projects = (library?.projects ?? []).filter((p) => p.isTemplate !== true);
    const q = filter.trim().toLowerCase();
    let list = q
      ? projects.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.artist ?? "").toLowerCase().includes(q) ||
            (p.genre ?? "").toLowerCase().includes(q) ||
            String(p.midiProgramId ?? "").includes(q),
        )
      : [...projects];
    if (sort === "title") {
      list = [...list].sort((a, b) =>
        a.name.localeCompare(b.name, "pl", { sensitivity: "base" }),
      );
    } else if (sort === "pc") {
      list = [...list].sort(
        (a, b) =>
          (a.midiProgramId ?? 0) - (b.midiProgramId ?? 0) ||
          a.name.localeCompare(b.name, "pl", { sensitivity: "base" }),
      );
    }
    return list;
  }, [library?.projects, filter, sort]);

  return (
    <div className={styles.split}>
      <section className={styles.card} aria-label="Utwory">
        <div className={styles.cardHead}>
          <h1 className={styles.cardTitle}>Utwory</h1>
          <div className={styles.actions}>
            <Button
              variant="secondary"
              loading={commandPending}
              disabled={locked}
              onClick={onCreate}
            >
              Nowy
            </Button>
          </div>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.toolbar}>
            <input
              className={styles.input}
              placeholder="Filtruj…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filtruj utwory"
            />
            <select
              className={styles.select}
              value={sort}
              onChange={(e) => {
                const v = e.target.value;
                setSort(v === "title" || v === "pc" ? v : "library");
              }}
              aria-label="Sortowanie"
            >
              <option value="library">Kolejność bazy</option>
              <option value="title">Tytuł A–Z</option>
              <option value="pc">PC</option>
            </select>
            <Button variant="ghost" disabled={locked} onClick={onBatchPc}>
              Batch PC
            </Button>
          </div>

          {libraryError ? (
            <p className={styles.error} role="alert">
              {libraryError}
            </p>
          ) : null}
          {actionError ? (
            <p className={styles.error} role="alert">
              {actionError}
            </p>
          ) : null}

          <div className={styles.list}>
            {visibleProjects.map((p) => (
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
                onClick={() => onSelect(p.id)}
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
                <span className={styles.songMeta} />
              </button>
            ))}
            {!library && !libraryError ? (
              <p className={styles.muted}>Wczytywanie…</p>
            ) : null}
            {library && visibleProjects.length === 0 ? (
              <p className={styles.muted}>Brak utworów dla filtra.</p>
            ) : null}
          </div>

          <div className={styles.templates}>
            <h2 className={styles.subTitle}>Wzory</h2>
            {(library?.projects ?? []).filter((p) => p.isTemplate).length === 0 ? (
              <p className={styles.muted}>
                Brak wzorów.{" "}
                <button type="button" className={styles.editLink} disabled={locked} onClick={onCreateTemplate}>
                  Utwórz wzór
                </button>
              </p>
            ) : (
              <ul className={styles.list}>
                {(library?.projects ?? [])
                  .filter((p) => p.isTemplate)
                  .map((t) => (
                    <li
                      key={t.id}
                      className={[styles.songRow, styles.songRowPair].join(" ")}
                    >
                      <span className={styles.songName}>{t.name}</span>
                      <Button
                        variant="secondary"
                        disabled={locked}
                        onClick={() => onCreateFromTemplate(t.id)}
                      >
                        Nowy z wzoru
                      </Button>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <div className={styles.splitAside}>
        <aside className={styles.card} aria-label="Wybrany utwór">
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>Wybrany</h2>
          </div>
          <div className={styles.cardBody}>
            {selected ? (
              <>
                <div className={styles.field}>
                  <label htmlFor="admin-project-name">Nazwa</label>
                  <div className={styles.nameRow}>
                    <input
                      id="admin-project-name"
                      className={styles.input}
                      value={draftName}
                      disabled={locked}
                      aria-label="Nazwa projektu"
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
                      Zapisz nazwę
                    </Button>
                  </div>
                </div>
                <p className={styles.inspectorId}>{selected.id}</p>
                <div className={styles.actions}>
                  <Button variant="secondary" disabled={locked} onClick={onXml}>
                    XML
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={locked || !selected?.hasMusicXml}
                    title={selected?.hasMusicXml ? "Ma MusicXML" : "Brak MusicXML — użyj XML"}
                    onClick={onXml}
                  >
                    Partytura
                  </Button>
                  {locked ? (
                    <span className={styles.editLinkMuted} aria-disabled>
                      Otwórz w Timeline
                    </span>
                  ) : (
                    <Link
                      className={styles.editLink}
                      to={selectedId ? `/timeline/${selectedId}` : "#"}
                      aria-disabled={!selectedId}
                    >
                      Otwórz w Timeline
                    </Link>
                  )}
                  <Button
                    variant="secondary"
                    disabled={!selectedId || commandPending}
                    onClick={() => selectedId && onPlay(selectedId)}
                  >
                    Odtwórz
                  </Button>
                  <Button
                    variant="ghost"
                    loading={commandPending}
                    disabled={locked}
                    onClick={onDelete}
                  >
                    Usuń
                  </Button>
                </div>
                <div>
                  <ProjectFilesPanel
                    projectId={selectedId}
                    locked={locked}
                  />
                </div>
              </>
            ) : (
              <p className={styles.muted}>Wybierz utwór z listy.</p>
            )}
          </div>
        </aside>

        <LibraryFilesCard
          locked={locked}
          error={actionError}
          notice={actionNotice}
          onOpenImport={onImport}
          onExport={onExportLibrary}
          onImportFile={onImportFile}
        />
      </div>
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
}: {
  onOpenImport: () => void;
  onExport: () => void;
  onImportFile: (file: File) => void;
  locked?: boolean;
  error?: string | null;
  notice?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <section className={styles.card} aria-label="Pliki">
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle}>Pliki</h2>
      </div>
      <div className={styles.cardBody}>
        <div
          className={styles.dropZone}
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
        <p className={styles.muted}>
          Archiwa ZIP / binarne .stagesync — na razie niewspierane (tylko JSON).
        </p>
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
            Eksport biblioteki
          </Button>
        </div>
      </div>
    </section>
  );
}

function useDoubleConfirm(action: () => Promise<void>, label: string) {
  const [pending, setPending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const arm = useCallback(() => {
    if (pending) {
      if (timerRef.current) clearTimeout(timerRef.current);
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
  return { pending, arm, label: pending ? `Potwierdź ${label}` : label };
}

function HostView({
  statusMsg,
  onPathPicker,
}: {
  statusMsg: string | null;
  onPathPicker: () => void;
}) {
  const [lines, setLines] = useState<HostLogLine[]>([]);
  const [paused, setPaused] = useState(false);
  const [network, setNetwork] = useState<NetworkInfo | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const n = await fetchNetworkInfo();
        if (!cancelled) setNetwork(n);
      } catch (err) {
        if (!cancelled) {
          setNetworkError(err instanceof Error ? err.message : "Błąd sieci");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/system/logs/stream");
    es.onmessage = (ev) => {
      if (pausedRef.current) return;
      try {
        const line = JSON.parse(ev.data) as HostLogLine;
        setLines((prev) => [...prev.slice(-199), line]);
      } catch {
        /* ignore */
      }
    };
    es.addEventListener("clear", () => {
      if (!pausedRef.current) setLines([]);
    });
    return () => es.close();
  }, []);

  return (
    <div className={styles.stack}>
      <section className={styles.card} aria-label="Sieć">
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Sieć</h2>
        </div>
        <div className={styles.cardBody}>
          {networkError ? (
            <p className={styles.error} role="alert">
              {networkError}
            </p>
          ) : null}
          {network ? (
            <>
              <p className={styles.muted}>
                Port <strong>{network.port}</strong> · {network.hostname} · v
                {network.version}
              </p>
              <ul className={styles.list}>
                {network.urls.map((u) => (
                  <li key={u} className={styles.songMeta}>
                    {u}
                  </li>
                ))}
              </ul>
            </>
          ) : networkError ? null : (
            <p className={styles.muted}>Wczytywanie…</p>
          )}
          {statusMsg ? (
            <p className={styles.muted} role="status">
              {statusMsg}
            </p>
          ) : null}
        </div>
      </section>

      <div className={styles.twoUp}>
        <section className={styles.card} aria-label="Logi">
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>Logi</h2>
            <div className={styles.actions}>
              <Button
                variant="ghost"
                selected={paused}
                onClick={() => setPaused((v) => !v)}
              >
                {paused ? "Wznów" : "Pauza"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  void (async () => {
                    try {
                      await clearHostLogs();
                      setLines([]);
                    } catch {
                      /* ignore */
                    }
                  })();
                }}
              >
                Wyczyść
              </Button>
            </div>
          </div>
          <pre className={styles.terminal} aria-live="polite">
            {lines.length === 0
              ? "Oczekiwanie na logi…"
              : lines
                  .map(
                    (l) =>
                      `${new Date(l.t).toISOString().slice(11, 19)} [${l.level}] ${l.msg}`,
                  )
                  .join("\n")}
          </pre>
        </section>

        <section className={styles.card} aria-label="MIDI">
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>MIDI</h2>
          </div>
          <div className={`${styles.cardBody} ${styles.midiBody}`}>
            <p className={styles.muted}>Host MIDI I/O — β2</p>
            <div className={styles.midiGrid}>
              <div className={styles.midiCard}>
                <span className={styles.midiLabel}>Clock/s</span>
                <span className={styles.midiValue}>—</span>
              </div>
              <div className={styles.midiCard}>
                <span className={styles.midiLabel}>SPP/s</span>
                <span className={styles.midiValue}>—</span>
              </div>
              <div className={styles.midiCard}>
                <span className={styles.midiLabel}>PC/s</span>
                <span className={styles.midiValue}>—</span>
              </div>
              <div className={styles.midiCard}>
                <span className={styles.midiLabel}>Beat→WS</span>
                <span className={styles.midiValue}>—</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className={styles.card} aria-label="O aplikacji">
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>O aplikacji</h2>
        </div>
        <div className={styles.cardBody}>
          <p>
            Wersja <strong>{APP_VERSION}</strong>
          </p>
          <div className={styles.actions}>
            <Button variant="secondary" disabled title="ADR 0004 — Docker">
              Sprawdź aktualizacje
            </Button>
            <select className={styles.select} disabled aria-label="Kanał">
              <option>Oficjalne</option>
              <option>Testowe</option>
            </select>
          </div>
          <div>
            <h3 className={styles.subTitle}>Kopie zapasowe</h3>
            <div className={styles.actions}>
              <Button variant="ghost" disabled>
                Przywróć…
              </Button>
              <Button variant="ghost" onClick={onPathPicker}>
                Path picker
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


function HostSettingsModal({
  onClose,
  onPathPicker,
}: {
  onClose: () => void;
  onPathPicker: () => void;
}) {
  return (
    <Modal title="Ustawienia hosta" onClose={onClose}>
      <fieldset className={styles.fieldset} disabled>
        <legend>MIDI</legend>
        <p className={styles.muted}>Host MIDI I/O — β2</p>
      </fieldset>
      <fieldset className={styles.fieldset}>
        <legend>Sieć</legend>
        <p className={styles.muted}>
          Port, hostname i URL-e — karta Sieć na zakładce Host.
        </p>
        <Button variant="ghost" onClick={onPathPicker}>
          Wybierz ścieżkę…
        </Button>
      </fieldset>
      <div className={styles.actions}>
        <Button variant="ghost" onClick={onClose}>
          Zamknij
        </Button>
        <Button variant="primary" onClick={onClose}>
          OK
        </Button>
      </div>
    </Modal>
  );
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
    <Modal title="MusicXML" onClose={onClose}>
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
                  setError(err instanceof Error ? err.message : "Upload nieudany");
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
    <Modal title="Batch PC" onClose={onClose}>
      <p className={styles.muted}>
        Numeracja Program Change (0–127) dla utworów (bez wzorów).
      </p>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <label className={styles.field}>
        Start PC
        <input
          className={styles.input}
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
            <input
              className={styles.input}
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
  return (
    <div className={styles.overlay} role="dialog" aria-modal>
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Zamknij"
        onClick={onClose}
      />
      <div className={styles.modalPanel}>
        <div className={styles.modalHead}>
          <h2>{title}</h2>
          <ShellIconButton label="Zamknij" onClick={onClose}>
            ×
          </ShellIconButton>
        </div>
        {children}
      </div>
    </div>
  );
}
