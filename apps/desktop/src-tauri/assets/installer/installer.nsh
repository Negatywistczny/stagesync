; ------------------------------------------------------------------
; StageSync NSIS Installer Hooks
; Cichy payload — UI splash robi stagesync-setup.
; ------------------------------------------------------------------

!define MUI_CUSTOMFUNCTION_GUIINIT StageSyncGuiInit

Function StageSyncGuiInit
  ShowWindow $HWNDPARENT 0
FunctionEnd

!macro NSIS_HOOK_PREINSTALL
  StrCpy $PassiveMode 1
  ShowWindow $HWNDPARENT 0
!macroend

!macro NSIS_HOOK_POSTINSTALL
  ; Start aplikacji robi bootstrapper (stagesync-setup), nie NSIS.
  ShowWindow $HWNDPARENT 0
!macroend
