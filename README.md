<p align="center">
  <img src="apps/desktop/resources/icon.png" width="96" alt="Chatto" />
</p>

<h1 align="center">Chatto（チャット）</h1>

<p align="center">可高度自訂的直播聊天室。</p>

---

## 功能

- **桌面 Overlay**：透明、置頂、滑鼠可穿透的聊天室視窗，打遊戲時也看得到聊天。
- **OBS 嵌入聊天室**：App 內建本機伺服器，OBS「瀏覽器來源」貼上網址就能用，背景自動透明。
- **OBS 外掛**：安裝後在 OBS 新增「Chatto 聊天室」來源，不用貼網址，每個來源可以選自己的主題；Chatto 沒開時顯示等待畫面。可在安裝檔或「輸出」頁安裝。
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
4. 寫在 `apps/desktop/.env` 的 `MAIN_VITE_TWITCH_CLIENT_ID`，建置時會內建進 App，使用者不用自己設定；沒有內建值時，使用者在 App 的帳號頁填入。

內建 Client ID 時，使用者仍可在帳號頁 Twitch 卡片的「進階設定」或設定頁的「進階」改用自己的 Client ID，也能改回內建。Client ID 是公開資訊，可以放進安裝檔；Chatto 不使用 client secret。

### 分支與 CI

分支依 `feature/*` → `develop` → `CI` → `main` 的順序合併。

| 分支                   | 推送或 PR 時                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| `feature/*`、`develop` | 不跑任何 workflow                                                                            |
| `CI`                   | 跑 CI（typecheck、單元與元件測試、web E2E、視覺回歸、Electron）；動到 OBS 外掛時另外建置外掛 |
| `main`                 | 跑 CI；推送時 CI 通過後接著發佈                                                              |

`CI` 與 `main` 受分支保護：只能透過 PR 合併，且 CI 必須通過。

### 發佈

推送到 `main` 且 CI 通過後，`.github/workflows/release.yml` 讀 `apps/desktop/package.json` 的版本：`v<版本>` tag 已存在就不做事；否則建置 OBS 外掛與安裝檔，打上 tag，建立草稿 Release 附上安裝檔，確認後在 GitHub 上發佈。要發新版，在 `develop` 提高版本號，並把 `apps/site/src/changelog.mjs` 裡「下一版」那筆改成這個版本與日期（Release 說明由它產生，沒有這個版本的紀錄時 Release 會失敗），再一路合併到 `main`。在 GitHub 按下發佈後，`site.yml` 會自動部署網站。發佈失敗時，可以在 Actions 頁面對 `main` 手動執行 Release 重試。

Release 同時附上 `latest.yml` 與 `.blockmap`：已安裝的 Chatto（`electron-updater`）啟動時與每 6 小時讀最新一份**已發佈**的 Release，有新版本時在標題列與設定頁「關於」提示，使用者同意後才下載；下載完按「重新啟動並更新」，或下次結束 Chatto 時安裝。草稿不會被讀到。

內建的 Client ID 來自 repository variable `TWITCH_CLIENT_ID`（Settings → Secrets and variables → Actions → Variables）。它是公開值，所以用 variable 而不是 secret。

### 只預覽畫面

```bash
npm run dev:viewer   # http://localhost:5174/overlay?mock=1&backdrop=1&theme=washi
npm run dev:web      # 控制台在瀏覽器執行（使用假資料）http://localhost:5175
```

## 指令

| 指令                       | 說明                                                                    |
| -------------------------- | ----------------------------------------------------------------------- |
| `npm run dev`              | 建置 viewer 並啟動 Electron                                             |
| `npm run typecheck`        | 所有 workspace 型別檢查                                                 |
| `npm test`                 | Vitest 單元與元件測試                                                   |
| `npm run test:e2e`         | Playwright：控制台與 viewer 的網頁 E2E                                  |
| `npm run test:visual`      | Playwright：主題與控制台的視覺回歸                                      |
| `npm run test:electron`    | 建置後以 Playwright 測試 Electron App                                   |
| `npm run test:all`         | 型別檢查加上所有測試                                                    |
| `npm run build`            | 建置 viewer 與桌面 App                                                  |
| `npm run build:obs-plugin` | 建置 OBS 外掛（需要 VS 2022 Build Tools 的 C++ 工作負載與 Windows SDK） |
| `npm run dist`             | 打包 Windows 安裝檔（含 OBS 外掛，輸出到 `apps/desktop/release/`）      |

測試的分層與寫法見 [`docs/testing.md`](docs/testing.md)。

## 專案結構

```
packages/core             標準化聊天格式、Provider 介面、主題 schema、WS 協定
packages/provider-twitch  Twitch：Device Code Flow、EventSub、Helix
packages/chat-ui          可主題化的聊天渲染器與預設主題
packages/share            主題分享的資料格式、檢查規則與 API 用戶端
apps/viewer               /overlay 與 /embed 頁面
apps/desktop              Electron 桌面 App（控制台、本機伺服器、Overlay 視窗）
apps/share-worker         主題分享服務（Cloudflare Worker）
apps/site                 chattolive.com 網站（首頁、主題、教學、常見問題、更新紀錄、條款）
obs-plugin                OBS 外掛「Chatto 聊天室」（C++，CMake）
docs/                     架構、訊息格式、主題、測試、控制台設計、美術與視覺識別、分享服務文件
```

詳見 [docs/architecture.md](docs/architecture.md)、[docs/message-format.md](docs/message-format.md)、[docs/theming.md](docs/theming.md)、[docs/design.md](docs/design.md)、[docs/visual-identity.md](docs/visual-identity.md)、[docs/share-service.md](docs/share-service.md)。

## 注意事項

- 遊戲若使用「獨佔全螢幕」，任何置頂視窗都會被蓋住，請改用「無邊框視窗」。
- 本機伺服器只綁定 `127.0.0.1`，區網內其他裝置無法讀取。

## 支持 Chatto

Chatto 免費開源。喜歡的話，可以請 Ciel 喝杯茶：

- [Ko-fi](https://ko-fi.com/ciel518)（國際付款）
- [綠界](https://p.ecpay.com.tw/C487EF9)（台灣付款）

## 授權

[GPL-3.0-or-later](LICENSE) © 2026 Ciel
