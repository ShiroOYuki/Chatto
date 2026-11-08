; Chatto installer additions (included by electron-builder):
; an optional page that installs the OBS plugin ("Chatto Chat" source) into
; OBS's shared plugin folder, C:\ProgramData\obs-studio\plugins\obs-chatto.
;
; This file is included twice, for the installer and (with BUILD_UNINSTALLER)
; for the uninstaller, before MUI and the LANG_* constants exist. So language
; ids are numeric (1033 English, 1028 Traditional Chinese, 1041 Japanese), installer-only
; variables and strings are guarded, and the page functions live inside the
; page macro, which is inserted after MUI is loaded.

!include nsDialogs.nsh
!include LogicLib.nsh

!macro ChattoObsPluginDir out
  ReadEnvStr ${out} PROGRAMDATA
  StrCpy ${out} "${out}\obs-studio\plugins\obs-chatto"
!macroend

!ifndef BUILD_UNINSTALLER
  Var ChattoObsCheckbox
  Var ChattoInstallObs

  LangString ChattoObsTitle 1033 "OBS plugin"
  LangString ChattoObsTitle 1028 "OBS 外掛"
  LangString ChattoObsTitle 1041 "OBS プラグイン"
  LangString ChattoObsSubtitle 1033 "Add Chatto's chat to OBS as its own source"
  LangString ChattoObsSubtitle 1028 "把 Chatto 的聊天室加進 OBS 的來源"
  LangString ChattoObsSubtitle 1041 "Chatto のチャットを OBS のソースとして追加します"
  LangString ChattoObsText 1033 "The plugin adds a $\"Chatto Chat$\" source to OBS: no URL to paste, and each source can use its own theme. You can also install or remove it later on the Outputs page."
  LangString ChattoObsText 1028 "外掛會在 OBS 新增「Chatto 聊天室」來源：不用貼網址，每個來源都能選自己的主題。之後也可以在 Chatto 的「輸出」頁安裝或移除。"
  LangString ChattoObsText 1041 "プラグインは OBS に「Chatto チャット」ソースを追加します。URL を貼り付ける必要はなく、ソースごとにテーマを選べます。あとから Chatto の「出力」ページでインストールや削除もできます。"
  LangString ChattoObsCheckbox 1033 "Install the OBS plugin"
  LangString ChattoObsCheckbox 1028 "安裝 OBS 外掛"
  LangString ChattoObsCheckbox 1041 "OBS プラグインをインストールする"
  LangString ChattoObsFailed 1033 "The OBS plugin couldn't be installed. If OBS is running, close it and install the plugin from Chatto's Outputs page."
  LangString ChattoObsFailed 1028 "OBS 外掛沒有裝好。如果 OBS 正在執行，請關閉後在 Chatto 的「輸出」頁安裝。"
  LangString ChattoObsFailed 1041 "OBS プラグインをインストールできませんでした。OBS が起動している場合は終了してから、Chatto の「出力」ページでインストールしてください。"
!endif

!macro customPageAfterChangeDir
  Page custom ChattoObsPageCreate ChattoObsPageLeave

  Function ChattoObsPageCreate
    !insertmacro MUI_HEADER_TEXT "$(ChattoObsTitle)" "$(ChattoObsSubtitle)"
    nsDialogs::Create 1018
    Pop $0
    ${NSD_CreateLabel} 0 0 100% 40u "$(ChattoObsText)"
    Pop $0
    ${NSD_CreateCheckbox} 0 48u 100% 12u "$(ChattoObsCheckbox)"
    Pop $ChattoObsCheckbox
    ; Checked when OBS has been installed or run on this computer.
    ReadEnvStr $1 PROGRAMDATA
    ${If} ${FileExists} "$1\obs-studio\*.*"
    ${OrIf} ${FileExists} "$APPDATA\obs-studio\*.*"
      ${NSD_Check} $ChattoObsCheckbox
    ${EndIf}
    nsDialogs::Show
  FunctionEnd

  Function ChattoObsPageLeave
    ${NSD_GetState} $ChattoObsCheckbox $ChattoInstallObs
  FunctionEnd
!macroend

!macro customInstall
  !insertmacro ChattoObsPluginDir $1
  ; Silent installs (updates) skip the page: keep an installed plugin in step with this version.
  ${If} $ChattoInstallObs == ${BST_CHECKED}
  ${OrIf} ${FileExists} "$1\bin\64bit\obs-chatto.dll"
    ClearErrors
    RMDir /r "$1"
    CreateDirectory "$1"
    CopyFiles /SILENT "$INSTDIR\resources\obs-plugin\obs-chatto\*.*" "$1"
    ${If} ${Errors}
      MessageBox MB_OK|MB_ICONEXCLAMATION "$(ChattoObsFailed)" /SD IDOK
    ${EndIf}
  ${EndIf}
!macroend

!macro customUnInstall
  ; An update runs the old uninstaller first; the plugin stays for the new version to refresh.
  ${ifNot} ${isUpdated}
    !insertmacro ChattoObsPluginDir $1
    RMDir /r "$1"
  ${endIf}
!macroend
