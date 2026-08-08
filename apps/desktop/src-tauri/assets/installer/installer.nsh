; ------------------------------------------------------------------
; StageSync NSIS Installer Hooks
; Tryb: Rozwiązanie hybrydowe (Minimal Extraction Banner)
; ------------------------------------------------------------------

!define MUI_CUSTOMFUNCTION_GUIINIT StageSyncGuiInit

Function StageSyncGuiInit
  ; Zmień tytuł okna (natywne obejście, unikające konfliktów z makrami MUI)
  SendMessage $HWNDPARENT 0xC 0 "STR:Przygotowywanie instalatora StageSync..."

  ; Ukryj przyciski na dole okna, aby stworzyć wrażenie bezobsługowego okna (Banner)
  GetDlgItem $0 $HWNDPARENT 1 ; Next
  ShowWindow $0 0
  GetDlgItem $0 $HWNDPARENT 2 ; Cancel
  ShowWindow $0 0
  GetDlgItem $0 $HWNDPARENT 3 ; Back
  ShowWindow $0 0

  ; Ukryj tekst brandingowy ("Nullsoft Install System")
  GetDlgItem $0 $HWNDPARENT 1028
  ShowWindow $0 0
FunctionEnd

!macro NSIS_HOOK_PREINSTALL
  ; Wymuszenie pominięcia wszystkich tradycyjnych ekranów (Welcome, Directory, Finish)
  StrCpy $PassiveMode 1

  ; Złap wewnętrzny kontener okna InstFiles (obszar postępu)
  FindWindow $0 "#32770" "" $HWNDPARENT
  
  ; Ukryj przycisk "Show details" na pasku ładowania
  GetDlgItem $1 $0 1027
  ShowWindow $1 0
!macroend

!macro NSIS_HOOK_POSTINSTALL
  ; Błyskawicznie uruchom aplikację po zakończeniu dekompresji
  ; Instalator NSIS zamknie się samoczynnie chwilę później.
  ExecShell "" "$INSTDIR\${MAINBINARYNAME}.exe"
!macroend
