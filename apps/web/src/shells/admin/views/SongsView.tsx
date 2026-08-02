import { useEffect, useId, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Select } from "@stagesync/ui";
import { type Library, type Project, formatSetDurationMs } from "@stagesync/shared";
import { useMqMobileCompact } from "../../../lib/useMqMobileCompact.js";
import { filterAndSortLibrarySongs } from "../filterLibrarySongs.js";
import { catalogSongBadges, songInspectorMeta } from "../songCatalogBadges.js";
import { AdminAccordionCard } from "../AdminAccordionCard.js";
import { ShellToolbar, MetaBadgeRow, MetaBadge } from "../../shared/index.js";
import { SettingsPopoverAnchor, SettingsPopover } from "../../SettingsPopover.js";
import { ShellIconButton } from "../../ShellIconButton.js";
import { IconTrash } from "../../icons.js";
import { ProjectFilesPanel } from "../ProjectFilesPanel.js";
import { LibraryFilesCard } from "./LibraryFilesCard.js";
import styles from "../../AdminShell.module.css";

interface SongsViewProps {
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
}

export function SongsView({
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
}: SongsViewProps) {
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
