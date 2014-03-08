!include MUI2.nsh

Name "RS Client Service"
OutFile "..\build\RS Client Installer.exe"
InstallDir "$WINDIR\ZZ_RSCLIENT"
InstallDirRegKey HKLM "System\CurrentControlSet\Services\RS Client Service" "NSISInstallDir"
RequestExecutionLevel admin

ShowInstDetails show

!insertmacro MUI_PAGE_LICENSE "InstallerReadme.txt"
!insertmacro MUI_PAGE_INSTFILES

  !insertmacro MUI_UNPAGE_CONFIRM
  !insertmacro MUI_UNPAGE_INSTFILES
  
  !insertmacro MUI_LANGUAGE "English"

Section "Program Files" SecProgFiles
  
  ExecWait 'net stop "RS Client Service"'
  
  SetOutPath "$INSTDIR"
  
  File /r "..\build\RS Client (Win32)\*"
  
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  

SectionEnd

Section "Install as Service" SecSvcInst
  
  ;Banner::show /set 76 "Installing as service..." "Please wait"
  ExecWait '"$INSTDIR\nssm.exe" install "RS Client Service" $INSTDIR\node.exe "$INSTDIR\rsclient.js --service"'
  ;Banner::show /set 76 "Starting service..." "Please wait"
  ExecWait 'net start "RS Client Service"'
  ;Banner::destroy
  
  WriteRegDWORD HKU "S-1-5-18\Software\TightVNC\Server" "AllowLoopback" 0x1
  
  WriteRegDWORD HKU "S-1-5-18\Software\TightVNC\Server" "AcceptRfbConnections" 0x1
  WriteRegDWORD HKU "S-1-5-18\Software\TightVNC\Server" "UseVncAuthentication" 0x1
  WriteRegDWORD HKU "S-1-5-18\Software\TightVNC\Server" "LoopbackOnly" 0x1
  WriteRegBin HKU "S-1-5-18\Software\TightVNC\Server" "Password" 2F981DC548E09EC2
  
SectionEnd

Section "Uninstall"
  
  ;Banner::show /set 76 "Stopping service..." "Please wait"
  ExecWait 'net stop "RS Client Service"'
  ;Banner::show /set 76 "Removing service..." "Please wait"
  ExecWait '"$INSTDIR\nssm.exe" remove "RS Client Service" confirm'
  ;Banner::destroy
  
  RMDir /r "$INSTDIR\node_modules"
  Delete "$INSTDIR\*"
  RMDir "$INSTDIR"
  
  DeleteRegKey HKLM "System\CurrentControlSet\Services\RS Client Service"


SectionEnd

