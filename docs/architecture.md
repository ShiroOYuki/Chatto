# 架構

## 資料流

```
 Twitch EventSub WS ─┐
 (未來) YouTube ──────┼─► ChatProvider ──► ChatHub (main process) ──┬─► LocalServer :4820 (/ws)
 (未來) Kick ─────────┘    標準化 ChatEvent      backlog 50 則          │     ├─► Overlay 視窗（/overlay）
                                                                   │     ├─► OBS 瀏覽器來源（/embed）
                                                                   │     │     或 OBS 外掛「Chatto 聊天室」（/embed?theme=）
                                                                   │     └─► 事件 Overlay 視窗（/alerts）
                                                                   └─► ControlLog（main）─► IPC ─► 控制台 renderer（紀錄、統計、預覽）
```

- **Provider** 負責連線、驗證、把平台 payload 轉成 `ChatEvent`。只有 provider 知道平台細節。
- **ChatHub** 是唯一的事件匯流點，保留最近 50 則，讓新開的 viewer 不會空白。刪除與清除事件也會同步修正 backlog。
- **LocalServer** 是只綁 `127.0.0.1` 的 HTTP 加 WebSocket 伺服器：HTTP 提供 viewer 靜態檔，`/ws` 推送事件與主題。
  - 每個 viewer 訂閱時可以帶 `themeId`（embed 頁的 `?theme=<id>`），改用那個主題；id 不存在或主題被刪掉時，改回該 target 選的主題。主題選擇、儲存、刪除與聊天室語言變更都呼叫 `refreshThemes()`：重新算出每個 viewer 該用的主題，只重送有變的。
  - `GET /api/ping`（`{ app: 'chatto', version }`）與 `GET /api/themes`（`[{ id, name }]`，介面語言）給 OBS 外掛用，不含 token 或聊天內容。
- **OBS 外掛**（`obs-plugin/`，C++，Windows）：模組 `obs-chatto`，來源類型 `chatto_chat`（「Chatto 聊天室」）。每個來源內含一個私有的 obs-browser 來源，載入 `/embed?theme=<id>`；一條背景執行緒每 3 秒問一次 `/api/ping`（WinHTTP，所有來源共用），Chatto 沒在跑時改顯示外掛內附的 `waiting.html`。外掛不自己畫聊天室，主題與自訂 CSS 全由 embed 頁處理。建置用 obs-plugintemplate 的 CMake 架構，對 OBS 31.1.1 編譯（`npm run build:obs-plugin`，輸出到 `obs-plugin/release/obs-chatto`）。
  - 安裝位置是 OBS 的共用外掛資料夾 `C:\ProgramData\obs-studio\plugins\obs-chatto`。控制台「輸出」頁（main `obs-plugin.ts` 的 `ObsPlugin`）與安裝檔（`apps/desktop/build/installer.nsh`）都能安裝；已安裝的檔案和這版 Chatto 附帶的不同時，就是「有新版本」。OBS 執行時會鎖住 DLL，要先關閉 OBS。
- **Overlay 視窗** 是透明、無框、置頂、滑鼠穿透的 `BrowserWindow`，載入 `/overlay`。編輯模式下暫時接受滑鼠，讓使用者拖曳與縮放，位置會存進設定。
- **事件 Overlay 視窗** 和 Overlay 視窗同一個類別（`OverlayWindow`），預設放在右上角，載入 `/alerts`，一次顯示一張事件卡片。
- **視窗外觀**（`shared/overlayLook.ts`）：兩個桌面視窗各有背景顏色、背景不透明度、聊天室不透明度（`settings.overlay.look`、`settings.alertsOverlay.look`，舊設定由 `normalizeOverlayLook` 補成透明背景、不透明度 100%）。這是視窗設定，不是主題參數，也不經過 WebSocket：`OverlayWindow` 在每次載入完成與設定改變時，用 `executeJavaScript` 在 `<html>` 設 `--chatto-backdrop`、`--chatto-chat-opacity`，`viewer.css` 套到 `body` 背景與 `#root` 的 `opacity`。OBS 的頁面沒有這兩個變數，維持透明；編輯模式的背景會蓋過自訂背景。
- **輸出路由**：`AppController.route(target, event)` 決定每個輸出收到什麼，由 LocalServer 在推送與 backlog 時套用。
  - `embed`（OBS）：原樣收到所有事件；提醒頁關掉「顯示在 OBS」時略過忠誠點數兌換。
  - 所有輸出都略過 `meta.shownAsMessage` 的通知（同一次兌換已經以聊天訊息出現）。
  - `overlay`：沉寂後的第一則留言加上 `after-silence` highlight；開啟「桌面聊天室不重複顯示」且事件 Overlay 開著時，略過會跳卡片的事件。
  - `alerts`：只收到通過提醒規則（開關、最低數量）的事件，並附上 `alert`（停留時間、音效）；刪除與清除事件照常送達，卡片會立刻移除。新連上的 alerts viewer 沒有 backlog，舊事件不會重播。
- **忠誠點數兌換**：只有頻道擁有者本人登入、token 有 `channel:read:redemptions` 時，provider 才訂閱兌換事件（`AppState.auth.redemptionScope` 回報 scope；舊 token 沒有，控制台提示重新登入，不強制登出）。兌換照常送到三個輸出；控制台另有兌換紀錄（`shared/redemptionLog.ts` 的純 reducer，main 與控制台各有一份，見下方「控制台視窗與記憶體」；顯示在聊天室頁，關閉只移出清單，不改 Twitch 上的狀態，也不寫入磁碟）。設定在 `AlertSettings.redemptions`。
- **提醒**（`main/alerts.ts`，純函式）：`SilenceTracker` 記錄最後一則一般留言的時間，頻道連上時從那一刻開始算；機器人、指令前綴與事件訊息不算留言。`alertCue()` 依規則決定事件要不要跳卡片。規則分兩種：跨平台分類（`ALERT_CATEGORIES`：贊助、訂閱、續訂、贈送訂閱、揪團、公告，鍵為 `any:<分類>`），由各平台在 `EVENT_CATALOG` 用 `alertCategory` 對應；沒有分類的平台專屬事件（例如 Twitch 的頻道點數強調訊息、觀看連勝）用自己的事件鍵當規則。新增平台時替事件填上 `alertCategory`，提醒頁就會自動歸類。
- **提示音**：內建音效（泡泡、金幣、鈴聲、雷射）是從 soundcn 收進來的 CC0 音效（`packages/chat-ui/src/soundcn/`，每個一個 base64 模組），用 `import()` 動態載入，不會打包進 OBS 的 embed 頁面；直接解碼 base64，不需要 fetch。使用者自選的音檔複製到 userData 的 `sounds/`，由 LocalServer 在 `/sounds/<檔名>` 提供（只接受 `[\w-]+.(mp3|ogg|wav)`）。沉寂提醒的聲音由控制台播放（沒開 Overlay 也聽得到）；控制台視窗已在系統匣釋放時，改由 main 開一個隱藏的小視窗（`main/sound-player.ts`，載入只有幾 KB 的 `renderer/sound.html`）播完就關。事件卡片的聲音由事件 Overlay 在卡片出現時播放。
- **控制台** 是 frameless 視窗，自繪標題列（含視窗按鈕）；有完整模式（側邊導覽多頁面）與精簡模式（單頁 Bento）。它只透過 `window.chatto`（preload 暴露的 `ChattoApi`）和 main 溝通，拿不到 token。

## 控制台視窗與記憶體（#57）

- **為什麼要換掉視窗**：控制台的 JS 只有約 10 MB，記憶體大多是 Chromium 的樣式、字型、繪圖。進過主題頁、編輯器、探索頁後 renderer 會從約 48 MB 漲到約 100 MB，而且已釋放的部分不會還給系統（模擬記憶體壓力也收不回來）。所以真正降得下來的方法是換一個新的 renderer。
- **縮到系統匣後釋放**：關閉到系統匣時先隱藏；隱藏滿 5 分鐘（`main/window-release.ts` 的 `WindowRelease`，開發版可用 `CHATTO_TRAY_RELEASE_MS` 縮短）才真的關掉視窗。從系統匣或第二次啟動開啟時重建視窗。
- **最小化太久就重建**：最小化滿 5 分鐘（`CHATTO_MINIMIZE_RELEASE_MS`）時，建一個新的視窗，一樣最小化、停在同一頁（控制台把目前頁面寫在網址的 `?page=`），準備好後關掉舊的，所以工作列按鈕一直都在。新視窗還沒被還原過就不會再重建；重建途中使用者還原了舊視窗，就保留舊的。
- 兩種釋放在主題編輯器有未儲存的變更時（`setUnsavedWork`）都不做。Overlay、OBS、事件 Overlay 都在 main 與 LocalServer，不受影響。
- **聊天紀錄在 main**：聊天紀錄、統計與兌換清單的純 reducer 在 `shared/chatLog.ts`、`shared/redemptionLog.ts`；main 的 `ControlLog`（`shared/controlLog.ts`）保存整個工作階段，每個事件帶遞增的 `seq` 送給控制台（`LoggedChatEvent`）。控制台開啟時先訂閱事件、再取 `getControlLog()` 快照，`reduceControlLogView` 只套用比快照新的事件，不漏也不重複。「清除」與「移出兌換」在兩邊各做一次。
- **延遲載入**：總覽以外的頁面、精簡模式、主題編輯器（含 CodeMirror）與投稿對話框用 `React.lazy` 拆開（`components/lazy.tsx`），第一次進入時才載入。這主要讓啟動變快，閒置記憶體幾乎不變。
- **主題預覽只畫看得到的**：`StaticThemePreview` 在卡片接近畫面（`useInView`）時才畫聊天室。主題卡片的預覽約佔主題頁 20 MB，其中字型約 15 MB；預設視窗大小下內建主題幾乎都在畫面內，所以差別出現在主題很多或探索頁的時候。
- **量測**：`app.getAppMetrics()` 的 `workingSetSize` 會把各程序共用的 Electron／Chromium DLL 重複計算；工作管理員的「記憶體」欄是私人工作集。比較前後時兩種都記。

## 紀錄檔與診斷資訊（#56）

- **紀錄檔**（`main/logger.ts`）：userData 的 `logs/chatto.log`，超過 1 MB 輪替成 `chatto.1.log`、`chatto.2.log`。記警告、錯誤（main 的 `console.warn`／`console.error` 也會寫入）與重要事件：啟動、本機 server、狀態變化（`describeStateChanges`：登入、聊天室連線、Overlay 開關、更新、主題分享，不含名稱）、視窗或子程序意外結束、OBS 外掛安裝、系統匣釋放。**不記** token 與聊天內容。
- **診斷資訊匯出**（`main/diagnostics.ts`，設定頁「關於 › 回報問題」）：一個 zip，內含 `info.json`（版本、作業系統、OBS 外掛狀態、連線摘要、各程序記憶體）、`settings.json`、`logs/`。設定經過 `SETTINGS_POLICY`／`PREFS_POLICY`：每個欄位都要決定保留、省略或轉換，**新增設定欄位時不寫進 policy 就無法編譯**，`diagnostics.test.ts` 也會比對實際的設定欄位。頻道與帳號名稱預設換成 `<channel>`（包含紀錄檔與錯誤文字裡出現的），使用者勾選才保留；分享用的匿名 ID、外部編輯器指令（可能含使用者名稱的路徑）不匯出；聊天訊息永遠不匯出。
- **回報問題**：開啟 GitHub 的 `bug_report.yml` 表單（`shared/reportIssue.ts`，預填版本），提示附上診斷資訊。

## Packages

| Package                   | 職責                                   | 相依          |
| ------------------------- | -------------------------------------- | ------------- |
| `@chatto/core`            | 格式、介面、協定、純工具函式           | 無            |
| `@chatto/provider-twitch` | Twitch 實作                            | core          |
| `@chatto/chat-ui`         | React 渲染器、主題、feed reducer、mock | core, react   |
| `@chatto/viewer`          | overlay／embed／alerts 頁面            | core, chat-ui |
| `@chatto/desktop`         | Electron App                           | 以上全部      |

workspace package 直接提供 TypeScript 原始碼，由 Vite／electron-vite 一起打包。主程序只匯入 `@chatto/chat-ui/themes`、`/events`、`/feed`（都不含 React），避免把 React 打進 main bundle。

## 新增平台

1. 建立 `packages/provider-<platform>`，實作 `ChatProvider`（`connect`、`disconnect`、`onEvent`、`state`）。
2. 把平台 payload 轉成 `ChatEvent`，mapper 寫成純函式並加上測試。
3. 在 `apps/desktop/src/main/app-controller.ts` 註冊 provider（之後會抽成 provider registry，支援同時連多個平台）。
4. renderer、viewer、主題都不需要修改。

## 安全

- Twitch 使用 Device Code Flow 的 public client，不需要 client secret。
- token 用 `safeStorage`（Windows DPAPI）加密存在 userData，只有 main process 讀得到。
- 控制台與 Overlay 視窗都啟用 `sandbox` 與 `contextIsolation`；外部連結只允許 `https://`，並交給系統瀏覽器開啟。
- 本機伺服器只綁 loopback，並限制靜態檔路徑不能跳出 viewer 資料夾。`/api/*` 只回主題 id、名稱與版本，而且不送 CORS 標頭，其他網頁讀不到。
- OBS 外掛的 embed 頁不需要控制 OBS，內部 browser 來源的 `webpage_control_level` 設為 0。
- 自訂 CSS 檔案的路徑由主題 id 產生，id 只接受 `[\w-]+`；外部編輯器指令只來自使用者自己的設定。
- 自動更新（main `updater.ts`，`electron-updater`）只讀 `ShiroOYuki/Chatto` 已發佈的 GitHub Release，下載後以 `latest.yml` 的 SHA-512 驗證才安裝。只會提示，下載與安裝都等使用者決定，不會在直播中自動重開。開發版不檢查。
- 更新對話框（#39）：只有啟動時的那次檢查會設 `update.prompt`（之後每 6 小時的檢查只更新標題列徽章），使用者略過的版本（`prefs.skippedUpdateVersion`）不跳。更新內容來自 Release 附檔 `changelog.json`（`release.yml` 由 `apps/site/src/changelogJson.mjs` 產生），main 下載後用 `shared/updateNotes.ts` 檢查格式、篩出跨過的版本，控制台只把文字當純文字畫（反引號是唯一格式）。讀不到時只顯示版本號與網站更新紀錄的連結。
- 雙擊 `.chattotheme`（#40）：安裝檔登記副檔名（`electron-builder.yml` 的 `fileAssociations`）。main 從 `process.argv` 或 `second-instance` 的參數找檔案（`main/opened-files.ts`，忽略 Electron 參數與不存在的檔案），用 `importThemePackage` 讀取（圖片先存，供預覽；沒用到的圖片下次啟動清掉），放進 `AppState.openedThemeFiles` 排隊。主題要等使用者在控制台按「匯入」才存成新的自訂主題。

## 主題分享（開發中，GitHub #4）

控制台的「探索」頁：瀏覽、安裝、投稿、按讚與檢舉別人分享的主題，以及管理功能；Chatto 帳號在「帳號」頁（和直播平台的登入放在一起，底層仍分開）。

- **共用程式**在 `packages/share`（`@chatto/share`），App 與服務都用：
  - `model.ts`：資料型別（`ShareThemeSummary`、`ShareAccount`、`ShareResult` …）、類別、建議 tag、上限、條款版本。
  - `rules.ts`：純函式：主題代碼（8 碼 Crockford Base32）、tag 正規化、自動 tag、`themeContentHash`、`checkPublish`（自訂 CSS 禁止外部 `url()`／`@import`、大小與圖片數上限）、`isAssetFile`。服務跑同樣的檢查。
  - `backend.ts`：`ShareBackend`，每個方法對應一個 `/v1` API；`protocol.ts`：路徑、狀態碼、上限、`SHARE_API_URL` 與備用網址 `share.json`。
  - `@chatto/share/http`：真正服務的 HTTP 用戶端（連不到時讀 `share.json` 找新網址一次）；`@chatto/share/fake`：記憶體內的假服務與範例主題，重開就清空。
- **服務**在 `apps/share-worker`（Cloudflare Worker＋D1＋R2），API、資料表、登入流程、部署步驟見 `docs/share-service.md`。已部署在 `api.chattolive.com`：打包版連正式服務，開發版預設用假服務（登入的帳號是管理者），`MAIN_VITE_SHARE_API_URL`／`CHATTO_SHARE_API` 可改（`main/share-backend.ts`）。
- `apps/desktop/src/shared/share/client.ts`：`ShareClient`，App 這端的流程：瀏覽器登入（本機回呼＋PKCE，`main/share-loopback.ts` 提供回呼頁）、session token、安裝（下載圖片、設定 `origin`，比 App 新的主題 schema 回 `app-outdated`）、投稿（圖片先轉成 `asset:` 檔案分別上傳，再送主題）、管理。預覽用的 `get()` 把 `asset:` 圖片換成服務上的網址（`ShareBackend.assetUrl`）。
- **App 裡** `ShareClient` 在 main process（`index.ts` 建立，`SafeSessionStore` 以 `safeStorage` 加密 session token，存在 userData `share.token`），控制台透過單一 IPC `share:call`（`SHARE_METHODS` 白名單）呼叫；帳號狀態在 `AppState.share`。縮圖由 `share:capture-thumbnail` 擷取主視窗的一塊區域。
- **網頁模式**的 mock API 在頁面裡直接建立 `ShareClient`＋假服務，圖片存在記憶體（`memoryAssets.ts`）。
- 控制台：`services/share.ts`（`shareCall`、`useShareSession`、`useInstalledThemes`、`useShareUpdates`）、`pages/explore/`。
- 登入和聊天室連線完全分開，不使用聊天平台的 token；登入方式（Twitch、Google、Discord）由服務代理 OAuth。
- 設定：`settings.share.clientId`（匿名下載計數）、`settings.share.termsAccepted`（同意過的條款版本，`SHARE_TERMS_VERSION`）。

## 路線圖

- [x] 主題編輯器（視覺化調整、版型切換、自訂 CSS、即時預覽）
- [x] 主題匯出／匯入（JSON）
- [ ] 第三方表情（7TV、BTTV、FFZ）resolver
- [ ] Provider registry 與多平台同時連線
- [x] 自動更新、開機自動啟動
