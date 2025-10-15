; NSIS installer script for JLCONE
; This script provides custom installer behavior

; Custom installer pages
!include "MUI2.nsh"

; Installer configuration
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"

; Custom installer functions
Function .onInit
  ; Check if application is already running
  System::Call 'kernel32::CreateMutex(i 0, i 0, t "JLCONE_INSTALLER_MUTEX") i .r1 ?e'
  Pop $R0
  StrCmp $R0 0 +3
    MessageBox MB_OK|MB_ICONEXCLAMATION "The installer is already running."
    Abort
FunctionEnd

; Custom uninstaller functions  
Function un.onInit
  MessageBox MB_ICONQUESTION|MB_YESNO|MB_DEFBUTTON2 "Are you sure you want to completely remove $(^Name) and all of its components?" IDYES +2
  Abort
FunctionEnd