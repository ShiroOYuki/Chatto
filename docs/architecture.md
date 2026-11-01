# 架構

## 資料流

```
 Twitch EventSub WS ─┐
 (未來) YouTube ──────┼─► ChatProvider ──► ChatHub (main process) ──┬─► LocalServer :4820 (/ws)
 (未來) Kick ─────────┘    標準化 ChatEvent      backlog 50 則          │     ├─► Overlay 視窗（/overlay）
                                                                   │     ├─► OBS 瀏覽器來源（/embed）
                                                                   │     └─► 事件 Overlay 視窗（/alerts）
                                                                   └─► IPC ─► 控制台 renderer（統計、預覽）
```

- **Provider** 負責連線、驗證、把平台 payload 轉成 `ChatEvent`。只有 provider 知道平台細節。
- **ChatHub** 是唯一的事件匯流點，保留最近 50 則，讓新開的 viewer 不會空白。刪除與清除事件也會同步修正 backlog。
- **LocalServer** 是只綁 `127.0.0.1` 的 HTTP 加 WebSocket 伺服器：HTTP 提供 viewer 靜態檔，`/ws` 推送事件與主題。
- **Overlay 視窗** 是透明、無框、置頂、滑鼠穿透的 `BrowserWindow`，載入 `/overlay`。編輯模式下暫時接受滑鼠，讓使用者拖曳與縮放，位置會存進設定。
- **事件 Overlay 視窗** 和 Overlay 視窗同一個類別（`OverlayWindow`），預設放在右上角，載入 `/alerts`，一次顯示一張事件卡片。
- **輸出路由**：`AppController.route(target, event)` 決定每個輸出收到什麼，由 LocalServer 在推送與 backlog 時套用。
  - `embed`（OBS）：原樣收到所有事件。
  - `overlay`：沉寂後的第一則留言加上 `after-silence` highlight；開啟「桌面聊天室不重複顯示」且事件 Overlay 開著時，略過會跳卡片的事件。
  - `alerts`：只收到通過提醒規則（開關、最低數量）的事件，並附上 `alert`（停留時間、音效）；刪除與清除事件照常送達，卡片會立刻移除。新連上的 alerts viewer 沒有 backlog，舊事件不會重播。
- **提醒**（`main/alerts.ts`，純函式）：`SilenceTracker` 記錄最後一則一般留言的時間，頻道連上時從那一刻開始算；機器人、指令前綴與事件訊息不算留言。`alertCue()` 依規則決定事件要不要跳卡片。
- **提示音**：內建音效是從 soundcn 收進來的 CC0 音效（`packages/chat-ui/src/soundcn/`，每個一個 base64 模組），用 `import()` 動態載入，不會打包進 OBS 的 embed 頁面；直接解碼 base64，不需要 fetch。使用者自選的音檔複製到 userData 的 `sounds/`，由 LocalServer 在 `/sounds/<檔名>` 提供（只接受 `[\w-]+.(mp3|ogg|wav)`）。沉寂提醒的聲音由控制台播放（沒開 Overlay 也聽得到），事件卡片的聲音由事件 Overlay 在卡片出現時播放。
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
- 本機伺服器只綁 loopback，並限制靜態檔路徑不能跳出 viewer 資料夾。

## 路線圖

- [x] 主題編輯器（視覺化調整、版型切換、自訂 CSS、即時預覽）
- [x] 主題匯出／匯入（JSON）
- [ ] 第三方表情（7TV、BTTV、FFZ）resolver
- [ ] Provider registry 與多平台同時連線
- [ ] 自動更新、開機自動啟動
