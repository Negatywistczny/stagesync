import { useCallback, useState } from "react";

export function useTimelineModals() {
  const [helpOpen, setHelpOpen] = useState(false);
  const [songScreenOpen, setSongScreenOpen] = useState(false);
  const [songImportOpen, setSongImportOpen] = useState(false);
  const [importAsNewSong, setImportAsNewSong] = useState(false);
  const [importApplying, setImportApplying] = useState(false);
  const [serverSettingsOpen, setServerSettingsOpen] = useState(false);

  const openSongImportWizard = useCallback((asNew: boolean) => {
    setImportAsNewSong(asNew);
    setSongImportOpen(true);
  }, []);

  const closeSongImportWizard = useCallback(() => {
    setSongImportOpen(false);
    setImportAsNewSong(false);
  }, []);

  return {
    helpOpen,
    setHelpOpen,
    songScreenOpen,
    setSongScreenOpen,
    songImportOpen,
    setSongImportOpen,
    importAsNewSong,
    setImportAsNewSong,
    importApplying,
    setImportApplying,
    serverSettingsOpen,
    setServerSettingsOpen,
    openSongImportWizard,
    closeSongImportWizard,
  };
}
