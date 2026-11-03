# 架構

## 資料流

```
 Twitch EventSub WS ─┐
 (未來) YouTube ──────┼─► ChatProvider ──► ChatHub (main process) ──┬─► LocalServer :4820 (/ws)
 (未來) Kick ─────────┘    標準化 ChatEvent      backlog 50 則          │     ├─► Overlay 視窗（/overlay）
                                                                   │     ├─► OBS 瀏覽器來源（/embed）
                                                                   │     │     或 OBS 外掛「Chatto 聊天室」（/embed?theme=）
                                                                   │     └─► 事件 Overlay 視窗（/alerts）
                                                                   └─► IPC ─► 控制台 renderer（統計、預覽）
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
- **輸出路由**：`AppController.route(target, event)` 決定每個輸出收到什麼，由 LocalServer 在推送與 backlog 時套用。
  - `embed`（OBS）：原樣收到所有事件。
  - `overlay`：沉寂後的第一則留言加上 `after-silence` highlight；開啟「桌面聊天室不重複顯示」且事件 Overlay 開著時，略過會跳卡片的事件。
  - `alerts`：只收到通過提醒規則（開關、最低數量）的事件，並附上 `alert`（停留時間、音效）；刪除與清除事件照常送達，卡片會立刻移除。新連上的 alerts viewer 沒有 backlog，舊事件不會重播。
- **提醒**（`main/alerts.ts`，純函式）：`SilenceTracker` 記錄最後一則一般留言的時間，頻道連上時從那一刻開始算；機器人、指令前綴與事件訊息不算留言。`alertCue()` 依規則決定事件要不要跳卡片。規則分兩種：跨平台分類（`ALERT_CATEGORIES`：贊助、訂閱、續訂、贈送訂閱、揪團、公告，鍵為 `any:<分類>`），由各平台在 `EVENT_CATALOG` 用 `alertCategory` 對應；沒有分類的平台專屬事件（例如 Twitch 的頻道點數強調訊息、觀看連勝）用自己的事件鍵當規則。新增平台時替事件填上 `alertCategory`，提醒頁就會自動歸類。
- **提示音**：內建音效（泡泡、金幣、鈴聲、雷射）是從 soundcn 收進來的 CC0 音效（`packages/chat-ui/src/soundcn/`，每個一個 base64 模組），用 `import()` 動態載入，不會打包進 OBS 的 embed 頁面；直接解碼 base64，不需要 fetch。使用者自選的音檔複製到 userData 的 `sounds/`，由 LocalServer 在 `/sounds/<檔名>` 提供（只接受 `[\w-]+.(mp3|ogg|wav)`）。沉寂提醒的聲音由控制台播放（沒開 Overlay 也聽得到），事件卡片的聲音由事件 Overlay 在卡片出現時播放。
- **控制台** 是 frameless 視窗，自繪標題列（含視窗按鈕）；有完整模式（側邊導覽多頁面）與精簡模式（單頁 Bento）。它只透過 `window.chatto`（preload 暴露的 `ChattoApi`）和 main 溝通，拿不到 token。

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

## 路線圖

- [x] 主題編輯器（視覺化調整、版型切換、自訂 CSS、即時預覽）
- [x] 主題匯出／匯入（JSON）
- [ ] 第三方表情（7TV、BTTV、FFZ）resolver
- [ ] Provider registry 與多平台同時連線
- [ ] 自動更新、開機自動啟動
