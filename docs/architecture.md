# 架構

## 資料流

```
 Twitch EventSub WS ─┐
 (未來) YouTube ──────┼─► ChatProvider ──► ChatHub (main process) ──┬─► LocalServer :4820 (/ws)
 (未來) Kick ─────────┘    標準化 ChatEvent      backlog 50 則          │     ├─► Overlay 視窗（/overlay）
                                                                   │     └─► OBS 瀏覽器來源（/embed）
                                                                   └─► IPC ─► 控制台 renderer（統計、預覽）
```

- **Provider** 負責連線、驗證、把平台 payload 轉成 `ChatEvent`。只有 provider 知道平台細節。
- **ChatHub** 是唯一的事件匯流點，保留最近 50 則，讓新開的 viewer 不會空白。刪除與清除事件也會同步修正 backlog。
- **LocalServer** 是只綁 `127.0.0.1` 的 HTTP 加 WebSocket 伺服器：HTTP 提供 viewer 靜態檔，`/ws` 推送事件與主題。
- **Overlay 視窗** 是透明、無框、置頂、滑鼠穿透的 `BrowserWindow`，載入 `/overlay`。編輯模式下暫時接受滑鼠，讓使用者拖曳與縮放，位置會存進設定。
- **控制台** 只透過 `window.chatto`（preload 暴露的 `ChattoApi`）和 main 溝通，拿不到 token。

## Packages

| Package                   | 職責                                   | 相依          |
| ------------------------- | -------------------------------------- | ------------- |
| `@chatto/core`            | 格式、介面、協定、純工具函式           | 無            |
| `@chatto/provider-twitch` | Twitch 實作                            | core          |
| `@chatto/chat-ui`         | React 渲染器、主題、feed reducer、mock | core, react   |
| `@chatto/viewer`          | overlay／embed 頁面                    | core, chat-ui |
| `@chatto/desktop`         | Electron App                           | 以上全部      |

workspace package 直接提供 TypeScript 原始碼，由 Vite／electron-vite 一起打包。主程序只匯入 `@chatto/chat-ui/themes`，避免把 React 打進 main bundle。

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

- [ ] 主題編輯器（視覺化調整、版型切換、自訂 CSS、即時預覽）
- [ ] 主題匯出／匯入（JSON）
- [ ] 第三方表情（7TV、BTTV、FFZ）resolver
- [ ] Provider registry 與多平台同時連線
- [ ] 自動更新、開機自動啟動
