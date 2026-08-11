import { Button } from "@stagesync/ui";
import type { LibraryProjectEntry } from "@stagesync/shared";
import type { DragEvent } from "react";
import shell from "../AdminShell.module.css";
import styles from "../SetView.module.css";

type SetLibraryCardProps = {
  compactMobile: boolean;
  filter: string;
  onFilterChange: (value: string) => void;
  libraryRows: LibraryProjectEntry[];
  draftProjectIds: string[];
  pickIds: string[];
  pending: boolean;
  onTogglePick: (id: string) => void;
  onLibraryDragStart: (projectId: string) => (e: DragEvent) => void;
  onAddOne: (id: string) => void;
  onAddPicked: () => void;
};

export function SetLibraryCard({
  compactMobile,
  filter,
  onFilterChange,
  libraryRows,
  draftProjectIds,
  pickIds,
  pending,
  onTogglePick,
  onLibraryDragStart,
  onAddOne,
  onAddPicked,
}: SetLibraryCardProps) {
  return (
    <>
      <div className={shell.setColHead}>
        {compactMobile ? null : (
          <strong className={shell.setColTitle}>Biblioteka</strong>
        )}
        <input
          className={shell.filterInput}
          type="search"
          placeholder="Filtr…"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          aria-label="Filtr utworów"
        />
      </div>
      <ul className={shell.setPickList}>
        {libraryRows.map((p) => {
          const inSet = draftProjectIds.includes(p.id);
          const checked = pickIds.includes(p.id);
          return (
            <li
              key={p.id}
              className={shell.setPickRow}
              draggable={!inSet && !pending}
              onDragStart={onLibraryDragStart(p.id)}
            >
              <label className={shell.setPickLabel}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={inSet || pending}
                  onChange={() => onTogglePick(p.id)}
                />
                <span className={shell.songName}>{p.name}</span>
              </label>
              <Button
                variant="ghost"
                iconOnly
                disabled={inSet || pending}
                aria-label={
                  inSet ? `${p.name} — już w secie` : `Dodaj ${p.name} do setu`
                }
                onClick={() => onAddOne(p.id)}
              >
                {inSet ? "✓" : "+"}
              </Button>
            </li>
          );
        })}
        {libraryRows.length === 0 ? (
          <li className={shell.muted}>Brak utworów w bibliotece.</li>
        ) : null}
      </ul>
      <div className={styles.libFooter}>
        <Button
          variant="secondary"
          disabled={pending || pickIds.length === 0}
          aria-label={`Dodaj zaznaczone (${pickIds.length})`}
          onClick={onAddPicked}
        >
          Dodaj zaznaczone ({pickIds.length})
        </Button>
      </div>
    </>
  );
}
