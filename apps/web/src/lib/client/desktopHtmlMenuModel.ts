/**
 * Declarative desktop menubar model for Windows/Linux HTML title bar (#836).
 * Action strings match `stagesync:desktop-menu` / DesktopMenuBridge handlers.
 */

import { DOCS_INSTALL_URL, DOCS_ISSUES_URL } from "./docsLinks.js";

export type DesktopMenuItemKind = "action" | "separator" | "submenu";

export type DesktopMenuActionItem = {
  kind: "action";
  id: string;
  label: string;
  /** Dispatched as DESKTOP_MENU_EVENT detail.action (or special ids below). */
  action?: string;
  shortcut?: string;
  disabled?: boolean;
  /** Open in system browser instead of menu event. */
  externalUrl?: string;
};

export type DesktopMenuSeparatorItem = {
  kind: "separator";
  id: string;
};

export type DesktopMenuSubmenuItem = {
  kind: "submenu";
  id: string;
  label: string;
  items: DesktopMenuLeaf[];
};

export type DesktopMenuLeaf =
  DesktopMenuActionItem | DesktopMenuSeparatorItem | DesktopMenuSubmenuItem;

export type DesktopMenuTopLevel = {
  id: string;
  label: string;
  items: DesktopMenuLeaf[];
};

export type EditHistoryFlags = {
  canUndo: boolean;
  canRedo: boolean;
};

export type RecentProject = {
  id: string;
  name: string;
};

function truncateLabel(name: string, maxChars: number): string {
  const trimmed = name.trim();
  if (!trimmed) return "Bez nazwy";
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars)}…`;
}

/** Build the Win/Linux HTML menubar (no top-level StageSync). */
export function buildHtmlDesktopMenu(
  recent: RecentProject[],
  history: EditHistoryFlags,
): DesktopMenuTopLevel[] {
  const recentItems: DesktopMenuLeaf[] =
    recent.length === 0
      ? [
          {
            kind: "action",
            id: "recent_empty",
            label: "Brak ostatnich",
            disabled: true,
          },
        ]
      : recent.map((p) => ({
          kind: "action" as const,
          id: `recent:${p.id}`,
          label: truncateLabel(p.name, 40),
          action: `navigate:/timeline/${p.id}`,
        }));

  return [
    {
      id: "file",
      label: "Plik",
      items: [
        {
          kind: "submenu",
          id: "file_new",
          label: "Nowy",
          items: [
            {
              kind: "action",
              id: "file_new_song",
              label: "Utwór",
              action: "file-new",
              shortcut: "Ctrl+N",
            },
            {
              kind: "action",
              id: "file_new_template",
              label: "Wzór",
              action: "file-new-template",
            },
            {
              kind: "action",
              id: "file_new_from_template",
              label: "Z wzoru…",
              action: "file-new-from-template",
            },
          ],
        },
        {
          kind: "action",
          id: "file_open",
          label: "Otwórz…",
          action: "file-open",
          shortcut: "Ctrl+O",
        },
        {
          kind: "submenu",
          id: "file_recent",
          label: "Otwórz ostatnie",
          items: recentItems,
        },
        { kind: "separator", id: "file_sep_1" },
        {
          kind: "action",
          id: "file_save",
          label: "Zapisz",
          action: "file-save",
          shortcut: "Ctrl+S",
        },
        {
          kind: "action",
          id: "file_save_as",
          label: "Zapisz jako…",
          action: "file-save-as",
          shortcut: "Ctrl+Shift+S",
        },
        { kind: "separator", id: "file_sep_2" },
        {
          kind: "action",
          id: "file_import_song",
          label: "Importuj utwór…",
          action: "file-import-song",
        },
        {
          kind: "action",
          id: "file_import",
          label: "Importuj bibliotekę…",
          action: "file-import",
        },
        {
          kind: "action",
          id: "file_export",
          label: "Eksportuj bibliotekę…",
          action: "file-export",
        },
        { kind: "separator", id: "file_sep_3" },
        {
          kind: "action",
          id: "file_close",
          label: "Zamknij projekt",
          action: "navigate:/admin",
        },
        { kind: "separator", id: "file_sep_4" },
        {
          kind: "action",
          id: "preferences",
          label: "Preferencje…",
          action: "preferences",
          shortcut: "Ctrl+,",
        },
        {
          kind: "action",
          id: "check_updates",
          label: "Sprawdź aktualizacje…",
          action: "check-updates",
        },
        { kind: "separator", id: "file_sep_5" },
        {
          kind: "action",
          id: "quit",
          label: "Zakończ",
          action: "app-quit",
          shortcut: "Ctrl+Q",
        },
      ],
    },
    {
      id: "edit",
      label: "Edycja",
      items: [
        {
          kind: "action",
          id: "edit_undo",
          label: "Cofnij",
          action: "edit-undo",
          shortcut: "Ctrl+Z",
          disabled: !history.canUndo,
        },
        {
          kind: "action",
          id: "edit_redo",
          label: "Ponów",
          action: "edit-redo",
          shortcut: "Ctrl+Shift+Z",
          disabled: !history.canRedo,
        },
        { kind: "separator", id: "edit_sep" },
        {
          kind: "action",
          id: "edit_cut",
          label: "Wytnij",
          action: "edit-cut",
          shortcut: "Ctrl+X",
        },
        {
          kind: "action",
          id: "edit_copy",
          label: "Kopiuj",
          action: "edit-copy",
          shortcut: "Ctrl+C",
        },
        {
          kind: "action",
          id: "edit_paste",
          label: "Wklej",
          action: "edit-paste",
          shortcut: "Ctrl+V",
        },
        {
          kind: "action",
          id: "edit_delete",
          label: "Usuń",
          action: "edit-delete",
        },
        {
          kind: "action",
          id: "edit_select_all",
          label: "Zaznacz wszystko",
          action: "edit-select-all",
          shortcut: "Ctrl+A",
        },
      ],
    },
    {
      id: "view",
      label: "Widok",
      items: [
        {
          kind: "action",
          id: "nav_admin",
          label: "Admin",
          action: "navigate:/admin",
          shortcut: "Ctrl+1",
        },
        {
          kind: "action",
          id: "nav_timeline",
          label: "Timeline",
          action: "navigate:/timeline",
          shortcut: "Ctrl+2",
        },
        {
          kind: "action",
          id: "nav_client",
          label: "Klient",
          action: "navigate:/client",
          shortcut: "Ctrl+3",
        },
        { kind: "separator", id: "view_sep_1" },
        {
          kind: "submenu",
          id: "admin_tabs",
          label: "Zakładki Admina",
          items: [
            {
              kind: "action",
              id: "admin_songs",
              label: "Utwory",
              action: "navigate:/admin?section=songs",
              shortcut: "Alt+1",
            },
            {
              kind: "action",
              id: "admin_set",
              label: "Setlista",
              action: "navigate:/admin?section=set",
              shortcut: "Alt+2",
            },
            {
              kind: "action",
              id: "admin_stage",
              label: "Scena",
              action: "navigate:/admin?section=stage",
              shortcut: "Alt+3",
            },
            {
              kind: "action",
              id: "admin_host",
              label: "Host",
              action: "navigate:/admin?section=host",
              shortcut: "Alt+4",
            },
          ],
        },
        { kind: "separator", id: "view_sep_2" },
        {
          kind: "action",
          id: "view_zoom_in",
          label: "Powiększ",
          action: "view-zoom-in",
          shortcut: "Ctrl+=",
        },
        {
          kind: "action",
          id: "view_zoom_out",
          label: "Pomniejsz",
          action: "view-zoom-out",
          shortcut: "Ctrl+-",
        },
        {
          kind: "action",
          id: "view_zoom_reset",
          label: "Rzeczywisty rozmiar",
          action: "view-zoom-reset",
          shortcut: "Ctrl+0",
        },
        { kind: "separator", id: "view_sep_3" },
        {
          kind: "action",
          id: "view_appearance",
          label: "Wygląd…",
          action: "appearance",
        },
        { kind: "separator", id: "view_sep_4" },
        {
          kind: "action",
          id: "fullscreen",
          label: "Pełny ekran",
          action: "view-fullscreen",
          shortcut: "F11",
        },
      ],
    },
    {
      id: "transport",
      label: "Odtwarzanie",
      items: [
        {
          kind: "action",
          id: "transport_play",
          label: "Odtwórz",
          action: "transport-play",
        },
        {
          kind: "action",
          id: "transport_stop",
          label: "Stop",
          action: "transport-stop",
        },
        { kind: "separator", id: "transport_sep" },
        {
          kind: "action",
          id: "transport_prev",
          label: "Poprzedni utwór",
          action: "transport-prev",
          shortcut: "Alt+←",
        },
        {
          kind: "action",
          id: "transport_next",
          label: "Następny utwór",
          action: "transport-next",
          shortcut: "Alt+→",
        },
      ],
    },
    {
      id: "host",
      label: "Host",
      items: [
        {
          kind: "action",
          id: "host_status",
          label: "Status",
          action: "navigate:/admin?section=host",
        },
        {
          kind: "action",
          id: "host_clients",
          label: "Klienci / urządzenia",
          action: "navigate:/admin?section=stage",
        },
        {
          kind: "action",
          id: "host_qr",
          label: "Kod QR…",
          action: "host-qr",
        },
        { kind: "separator", id: "host_sep" },
        {
          kind: "action",
          id: "host_restart",
          label: "Restart hosta",
          action: "host-restart",
        },
        {
          kind: "action",
          id: "host_settings",
          label: "Ustawienia…",
          action: "navigate:/admin?section=host",
        },
      ],
    },
    {
      id: "help",
      label: "Pomoc",
      items: [
        {
          kind: "action",
          id: "help_shortcuts",
          label: "Skróty klawiszowe…",
          action: "help-shortcuts",
          shortcut: "Ctrl+/",
        },
        {
          kind: "action",
          id: "help_docs",
          label: "Dokumentacja StageSync online",
          externalUrl: DOCS_INSTALL_URL,
        },
        {
          kind: "action",
          id: "help_issues",
          label: "Zgłoś problem / Feedback",
          externalUrl: DOCS_ISSUES_URL,
        },
        {
          kind: "action",
          id: "help_export",
          label: "Eksportuj logi diagnostyczne…",
          action: "diagnostics-export",
        },
        { kind: "separator", id: "help_sep" },
        {
          kind: "action",
          id: "help_about",
          label: "O programie StageSync",
          action: "navigate:/admin?section=host",
        },
      ],
    },
  ];
}
