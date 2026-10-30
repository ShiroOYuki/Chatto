<p align="center">
  <img src="apps/desktop/resources/icon.png" width="96" alt="Chatto" />
</p>

<h1 align="center">Chatto（チャット）</h1>

<p align="center">把 Twitch 聊天室泡成一杯好看的茶：桌面透明 Overlay ＋ OBS 自訂聊天室。</p>

---

## 功能

- **桌面 Overlay**：透明、置頂、滑鼠可穿透的聊天室視窗，打遊戲時也看得到聊天。
- **OBS 嵌入聊天室**：App 內建本機伺服器，OBS「瀏覽器來源」貼上網址就能用，背景自動透明。
- **主題系統**：內建抹茶玻璃、和紙、泡泡、極簡描邊、暖簾、終端機六種風格；風格與配色分開，可自由組合、寫自訂 CSS、匯出／匯入 JSON。
- **即時同步刪除**：被管理員刪除或封鎖的訊息會立刻從畫面消失。
- **為多平台設計**：所有平台都轉換成同一份標準化聊天格式，之後加入 YouTube、Kick 不需改動畫面層。

## 開始使用（開發）

需求：Node.js 22+、Windows 10/11。

```bash
npm install
cp apps/desktop/.env.example apps/desktop/.env   # 可選：填入預設 Twitch Client ID
npm run dev                                       # 啟動桌面 App
```

### Twitch Client ID

1. 到 [Twitch Developer Console](https://dev.twitch.tv/console/apps) 建立應用程式。
2. **Client Type 選 Public**（Chatto 使用 Device Code Flow，不需要也不會存放 client secret）。
3. OAuth Redirect URL 可填 `http://localhost`（Device Code Flow 不會用到）。
4. 把 Client ID 填進 App，或寫在 `apps/desktop/.env`。

### 只預覽畫面

```bash
npm run dev:viewer   # http://localhost:5174/overlay?mock=1&backdrop=1&theme=washi
npm run dev:web      # 控制台在瀏覽器執行（使用假資料）http://localhost:5175
```

## 指令

| 指令                | 說明                                                  |
| ------------------- | ----------------------------------------------------- |
| `npm run dev`       | 建置 viewer 並啟動 Electron                           |
| `npm run typecheck` | 所有 workspace 型別檢查                               |
| `npm test`          | Vitest 單元測試                                       |
| `npm run build`     | 建置 viewer 與桌面 App                                |
| `npm run dist`      | 打包 Windows 安裝檔（輸出到 `apps/desktop/release/`） |

## 專案結構

```
packages/core             標準化聊天格式、Provider 介面、主題 schema、WS 協定
packages/provider-twitch  Twitch：Device Code Flow、EventSub、Helix
packages/chat-ui          可主題化的聊天渲染器與預設主題
apps/viewer               /overlay 與 /embed 頁面
apps/desktop              Electron 桌面 App（控制台、本機伺服器、Overlay 視窗）
docs/                     架構、訊息格式、主題文件
```

詳見 [docs/architecture.md](docs/architecture.md)、[docs/message-format.md](docs/message-format.md)、[docs/theming.md](docs/theming.md)。

## 注意事項

- 遊戲若使用「獨佔全螢幕」，任何置頂視窗都會被蓋住，請改用「無邊框視窗」。
- 本機伺服器只綁定 `127.0.0.1`，區網內其他裝置無法讀取。

## 授權

[GPL-3.0-or-later](LICENSE) © 2026 Ciel
