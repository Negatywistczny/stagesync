import type { ComponentType, SVGProps } from "react";
import { useMemo } from "react";
import { Badge } from "@stagesync/ui";
import {
  Activity,
  AudioWaveform,
  Boxes,
  Clock,
  Diff,
  FolderOpen,
  Grid3x3,
  Gauge,
  LayoutDashboard,
  MonitorPlay,
  MonitorSmartphone,
  Music2,
  NotebookPen,
  Satellite,
  Settings2,
  Smartphone,
  Sparkles,
  TestTubeDiagonal,
  Tv2,
  Wand2,
} from "lucide-react";
import styles from "./DevView.module.css";
import {
  DEV_PREVIEW_ROUTES,
  DEV_SURFACES,
  buildDevPreviewUrl,
  parseDevPreviewSearch,
} from "../../dev/devPreviewConfig.js";

type LucideIcon = ComponentType<SVGProps<SVGSVGElement>>;

type DevTileItem = {
  label: string;
  description: string;
  to?: string;
  icon: LucideIcon;
  planned?: boolean;
};

type DevShortcutItem = {
  label: string;
  to: string;
  icon: LucideIcon;
};

type DevGroup = {
  title: string;
  variant: "tiles" | "shortcuts";
  items: (DevTileItem | DevShortcutItem)[];
};

function buildDefaultDevPreviewUrls(): DevShortcutItem[] {
  const defaults = parseDevPreviewSearch("");
  const combos: {
    label: string;
    surface: (typeof DEV_SURFACES)[number];
    path: (typeof DEV_PREVIEW_ROUTES)[number];
    icon: LucideIcon;
  }[] = [
    { label: "Admin (web)", surface: "web", path: "/admin", icon: LayoutDashboard },
    { label: "Client (web)", surface: "web", path: "/client", icon: MonitorPlay },
    { label: "Timeline (web)", surface: "web", path: "/timeline", icon: Gauge },
    {
      label: "Performer (Android preview)",
      surface: "performer",
      path: "/client",
      icon: Smartphone,
    },
    {
      label: "Console (Android preview)",
      surface: "console",
      path: "/admin",
      icon: Tv2,
    },
    { label: "Tauri desktop", surface: "tauri", path: "/admin", icon: MonitorSmartphone },
  ];
  return combos.map((c) => ({
    label: c.label,
    icon: c.icon,
    to: buildDevPreviewUrl(
      {
        ...defaults,
        surface: c.surface,
        path: c.path,
        session: c.surface === "web",
      },
      "",
    ),
  }));
}

export function DevView() {
  const groups = useMemo<DevGroup[]>(() => {
    const shortcuts = buildDefaultDevPreviewUrls();
    return [
      {
        title: "Testy · benchmarki",
        variant: "tiles",
        items: [
          {
            label: "Smart Tempo — dokładność siatki",
            description:
              "Wizualizacja i porównanie dokładności wykrywania tempa vs referencja Logic Pro. Eksport CSV, historia benchmarków.",
            to: "/smart-tempo",
            icon: Activity,
          },
          {
            label: "Dev Preview — multi-surface",
            description:
              "Osadzone preview wszystkich platform (web/tauri/console/performer) w jednym ekranie, z przełączaniem dróg i flagą sesji.",
            to: "/_dev/preview",
            icon: Satellite,
          },
          {
            label: "Layout Matrix — responsive UI",
            description:
              "Kafelki ze wszystkimi ekranami + breakpointy (mobile / tablet / desktop / 4K). Oś czasu, kanały, panele admina.",
            to: "/_dev/layouts",
            icon: Grid3x3,
          },
        ] satisfies DevTileItem[],
      },
      {
        title: "Skróty Dev Preview",
        variant: "shortcuts",
        items: shortcuts,
      },
      {
        title: "Następne narzędzia (w planie)",
        variant: "tiles",
        items: [
          {
            label: "Diagnostyka silnika audio",
            description:
              "AudioWorklety, zużycie CPU audio, dropouty (underrun), rozmiar buffera, lista urządzeń I/O, test loopback.",
            icon: AudioWaveform,
            planned: true,
          },
          {
            label: "Diagnostyka MIDI",
            description:
              "Urządzenia IN/OUT, test Note/CC/PC, MMC transport, MTC/MIDI Clock loopback, mapowanie CC na kontrolki mixer.",
            icon: Music2,
            planned: true,
          },
          {
            label: "Timeline Performance Benchmark",
            description:
              "Scenariusze 100/500/1000 barów, toggle'y feature-flag (audio / score / video / VU), średni render, wake-lock.",
            icon: Clock,
            planned: true,
          },
          {
            label: "Asset Explorer / Inspector",
            description:
              "Przeglądaj /data/assets (rozmiar, typ, md5, użycie), preview audio, dedup, metadane ZIP backupu, bulk delete.",
            icon: FolderOpen,
            planned: true,
          },
          {
            label: "Stan transportu + diff snapshotów",
            description:
              "Na żywo TransportState, diff snapshotów, historia play/stop/seek, odtworzenie kolejki poleceń z logów.",
            icon: Diff,
            planned: true,
          },
          {
            label: "Feature Flag Toggles (per sesja)",
            description:
              "DSP_DIAG, timingHints nad nazwami sekcji, mock schedulera audio, strict knip/TS. Ciasteczka — po F5 trwają.",
            icon: Settings2,
            planned: true,
          },
          {
            label: "UI Sandbox · Component Playbook",
            description:
              "Komponenty @stagesync/ui z interaktywnymi propsami — zamiennik Storybooka, offline w Vite dev.",
            icon: NotebookPen,
            planned: true,
          },
          {
            label: "Fixture library — testowe projekty",
            description:
              "Gotowe project.json: pusty, mega 200 utworów, zepsuty (migracje), MIDI-only, Smart Tempo edge-case rubato.",
            icon: TestTubeDiagonal,
            planned: true,
          },
        ] satisfies DevTileItem[],
      },
    ];
  }, []);

  return (
    <div className={styles.root}>
      {groups.map((group) => (
        <section key={group.title} className={styles.group}>
          <header className={styles.groupHead}>
            {group.variant === "shortcuts" ? (
              <Sparkles className={styles.tileIcon} aria-hidden />
            ) : group.items.some((i) => "planned" in i && i.planned) ? (
              <Wand2 className={styles.tileIcon} aria-hidden />
            ) : (
              <Boxes className={styles.tileIcon} aria-hidden />
            )}
            <h2 className={styles.groupTitle}>{group.title}</h2>
          </header>

          {group.variant === "tiles" ? (
            <div className={styles.tileGrid}>
              {(group.items as DevTileItem[]).map((it) => {
                const Icon = it.icon;
                const className = `${styles.tile} ${it.planned ? styles.tilePlanned : ""}`;
                const body = (
                  <>
                    <div className={styles.tileHead}>
                      <Icon className={styles.tileIcon} aria-hidden />
                      {it.planned ? <Badge>W PLANIE</Badge> : null}
                    </div>
                    <h3 className={styles.tileTitle}>{it.label}</h3>
                    <p className={styles.tileDesc}>{it.description}</p>
                    {it.to ? (
                      <span className={styles.tilePath} aria-hidden>
                        → {it.to}
                      </span>
                    ) : null}
                  </>
                );
                if (it.to && !it.planned) {
                  return (
                    <a key={it.label} href={it.to} className={className}>
                      {body}
                    </a>
                  );
                }
                return (
                  <div key={it.label} className={className} role="group">
                    {body}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.shortcutGrid}>
              {(group.items as DevShortcutItem[]).map((it) => {
                const Icon = it.icon;
                return (
                  <a
                    key={it.label}
                    href={it.to}
                    className={`${styles.tile} ${styles.shortcutTile}`}
                  >
                    <Icon className={styles.tileIcon} aria-hidden />
                    <span className={styles.tileTitle}>{it.label}</span>
                  </a>
                );
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
