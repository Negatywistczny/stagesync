import { useState } from "react";
import {
  canRedo,
  canUndo,
  type DraftHistory,
} from "@lib/client/draftHistory.js";
import { toggleAppFullscreen } from "@lib/client/desktopBridge.js";
import { shouldShowFullscreenControl } from "@lib/shell-operator/operatorSurface.js";
import { AppHeaderActions } from "../../components/AppHeader.js";
import { ShellIconButton } from "../../components/ShellIconButton.js";
import { IconFullscreen } from "../../components/icons.js";

interface Params {
  isMobilePreview: boolean;
  isCompactMobile: boolean;
  showOperatorNav: boolean;
  draftHistory: DraftHistory | null;
  dirty: boolean;
  savePending: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => Promise<void> | void;
  onDiscard: () => void;
  helpOpen: boolean;
  setHelpOpen: (v: boolean) => void;
}

export function useTimelineAppHeader({
  isMobilePreview,
  isCompactMobile,
  showOperatorNav,
  draftHistory,
  dirty,
  savePending,
  onUndo,
  onRedo,
  onSave,
  onDiscard,
  helpOpen,
  setHelpOpen,
}: Params) {
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);

  const operatorNavCompact = isCompactMobile && showOperatorNav;

  const headerHistory = isMobilePreview
    ? undefined
    : {
        canUndo: Boolean(draftHistory && canUndo(draftHistory)),
        canRedo: Boolean(draftHistory && canRedo(draftHistory)),
        dirty,
        savePending,
        onUndo,
        onRedo,
        onSave: () => {
          void onSave();
        },
        onDiscard,
      };

  const headerOnFullscreen = shouldShowFullscreenControl()
    ? () => {
        void (async () => {
          try {
            await toggleAppFullscreen();
            setFullscreenError(null);
          } catch (err) {
            setFullscreenError(
              err instanceof Error
                ? err.message
                : "Nie udało się przełączyć pełnego ekranu",
            );
          }
        })();
      }
    : undefined;

  const timelineHeaderActions = (
    <AppHeaderActions
      history={headerHistory}
      helpPressed={helpOpen}
      onHelp={() => setHelpOpen(true)}
      onFullscreen={operatorNavCompact ? undefined : headerOnFullscreen}
    />
  );

  const fullscreenButton = shouldShowFullscreenControl() ? (
    <ShellIconButton label="Pełny ekran" onClick={headerOnFullscreen}>
      <IconFullscreen />
    </ShellIconButton>
  ) : null;

  return {
    operatorNavCompact,
    fullscreenError,
    setFullscreenError,
    headerHistory,
    headerOnFullscreen,
    timelineHeaderActions,
    fullscreenButton,
  };
}
