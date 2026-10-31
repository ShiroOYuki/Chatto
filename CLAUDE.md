# Chatto — 專案指引

Chatto（チャット）是一個 Windows 桌面應用程式，把 Twitch 聊天室做成：

1. **桌面 Overlay**：實況主桌面上透明、置頂、滑鼠可穿透的聊天室疊層。
2. **OBS Embed**：App 內建的 localhost server，提供給 OBS Browser Source 的自訂聊天室頁面。

象徵是**茶杯**（チャット ≈ お茶 + chat）。授權 GPL-3.0-or-later。

## 溝通

- 與使用者（Ciel）溝通一律使用**繁體中文**；程式碼、識別字、commit message、程式註解使用英文。
- 使用者是前端工程師（React / TypeScript / Tailwind），解釋時不需要從零教起。

## 架構

npm workspaces monorepo：

```
packages/
  core/             @chatto/core — 標準化聊天格式、ChatProvider 介面、主題 schema、WS 傳輸協定（無平台相依、無 I/O）
  provider-twitch/  @chatto/provider-twitch — Device Code Flow、EventSub WebSocket、Helix、payload → 標準格式
  chat-ui/          @chatto/chat-ui — 可主題化的 React 聊天渲染器、feed reducer、預設主題、mock 產生器
apps/
  viewer/           @chatto/viewer — /overlay 與 /embed 頁面，由桌面 App 的本機 server 提供；瀏覽器可用 ?mock=1 獨立預覽
  desktop/          @chatto/desktop — Electron（electron-vite）：main / preload / renderer（控制台）
docs/               architecture.md、message-format.md、theming.md
```

資料流：`Provider → ChatHub（main process）→ 本機 WebSocket → viewer（overlay 視窗與 OBS）`；控制台透過 IPC 與 main 溝通。

### 核心原則

- **所有平台只輸出 `ChatEvent`**（`@chatto/core/src/message.ts`）。renderer、主題、傳輸層不得相依任何平台的原生 payload。
- **新增平台** = 新增 `packages/provider-<platform>`，實作 `ChatProvider`，並在桌面 App 的 provider registry 註冊。其他層不需修改。
- **格式變更**：破壞性修改要遞增 `SCHEMA_VERSION` / `THEME_SCHEMA_VERSION`，並同步更新 `docs/message-format.md` 或 `docs/theming.md`。
- **mapper 保持純函式**，以錄下的 payload 寫單元測試。
- **刪除、封鎖事件**（message-deleted / user-cleared / chat-cleared）必須立即從畫面移除，不能殘留在直播畫面上。
- token 只存在 main process，使用 Electron `safeStorage` 加密；不得傳入 renderer 或 viewer，也不得出現在 URL。
- Twitch 使用公開客戶端（Device Code Flow），**不使用 client secret**。

## 聊天室主題系統

- Schema v2：**一個基底、全部是參數**。所有主題都經過同一個渲染器與 CSS 產生器（`packages/chat-ui/src/themeCss.ts`），主題只是 `BASE_THEME` 的參數值。**不得**為單一風格寫死專用 CSS；需要新外觀時，新增或擴充參數，讓編輯器也能調。
- 內建預設：抹茶玻璃、和紙、泡泡、極簡描邊、暖簾、終端機，全部只覆蓋基底參數；另有 `blank`（`base: 'blank'`，不產生任何樣式，只留結構與 `customCss`）。
- 新增參數時要同時：更新 `BASE_THEME` 預設值、`themeToCss`、編輯器欄位、`docs/theming.md`，並在 `normalizeTheme` 補舊資料的預設。
- 使用者可以選預設、逐項精細調整（四邊內距、四角圓角、框線、陰影、模糊、身分樣式等）、寫自訂 CSS、匯出／匯入 JSON。Overlay 與 Embed 可以各自使用不同主題。
- **平台事件**：以 `平台:事件` 識別（如 `twitch:cheer`），清單集中在 `packages/chat-ui/src/events.ts` 的 `EVENT_CATALOG`，編輯器的「<平台> 專屬元件」選單由它產生。`theme.notice` 是通用事件訊息；`theme.events[key]` 為 `{ linked, style }`，linked 時持續跟隨通用樣式，編輯即解除連動。新增平台事件時：provider mapper 設 `eventType`、在 catalog 加定義與範例、更新 `docs/message-format.md`。
- 可客製元素的說明集中在 `packages/chat-ui/src/reference.ts`（編輯器的 class 標籤、自動完成、檢查標籤都用它），新增 class 或屬性時同步更新。
- 主題編輯器的預覽有「範例」（`createSpecimenEvents()`，涵蓋所有元件與事件）與「即時」兩種模式，並提供檢查模式與選擇器建構器；自訂 CSS 使用 CodeMirror 6。
- 控制台裡的聊天預覽用 `all: revert` 隔離 Tailwind preflight，確保預覽與 OBS 實際畫面一致。
- 所有可被客製的元素使用穩定的 `chatto-*` class 與 `data-*` 屬性，視為公開 API，改名屬於破壞性變更。

## 控制台 App UI 方向

- 兩種介面模式：**完整模式**（左側導覽：總覽、聊天室、主題、輸出、連線、設定）與**精簡模式**（單頁 Bento 控制台），由標題列或設定切換，存在 `prefs.uiMode`。
- 主視窗為 frameless，自繪標題列並整合最小化／最大化／關閉；關閉行為依 `prefs.closeToTray` 決定縮到系統匣或結束。
- 版面採 **Bento 格狀**，整體**簡潔直觀**。
- **可愛元素只在適當處點綴**：茶杯吉祥物、空狀態插圖、連線成功的小動畫、親切的提示文字。不能干擾操作，也不能降低資訊密度的可讀性。
- 主色系為抹茶綠，需支援亮色與暗色。
- 文案用繁體中文，簡短、動詞開頭，不使用驚嘆號堆疊。

## 技術棧

- TypeScript（strict）、React 19、Vite、Tailwind CSS v4（控制台與 viewer 外框）。
- 動畫用 **Motion**（`motion/react`），共用彈簧與元件集中在 `apps/desktop/src/renderer/src/components/motion.tsx`。**不使用 Animate UI**：其 MIT + Commons Clause 授權與 GPL 不相容。新增第三方套件前先確認授權與 GPL-3.0 相容，並更新 `THIRD_PARTY_NOTICES.md`。
- 元件：**shadcn/ui + Radix**（互動元件）與 **Magic UI**（特效）放在 `apps/desktop/src/renderer/src/components/ui/`，**Kibo UI**（進階元件：顏色選擇器、Status、Pill、Snippet、Theme Switcher、Spinner、Choicebox、Tags）放在 `components/kibo-ui/`。Kibo 沒有基礎元件，Switch、Tabs、Button、Input、Select、Slider、Tooltip 等一律用 shadcn/ui；Chatto 自己的包裝在 `components/kit.tsx`，頁面優先使用 kit。新增元件時在 `apps/desktop` 執行 `npx shadcn@latest add <name>` 、`npx shadcn@latest add @magicui/<name>` 或 `npx shadcn@latest add @kibo-ui/<name>`，之後檢查 `import { cn } from "cn"` 要改回 `@/lib/utils`，並移除 CLI 多裝的 `cn`、`next-themes` 套件；CLI 若詢問是否覆寫既有的 `ui/` 元件，不要覆寫。複製進來的 Kibo 元件有些已改寫（顏色選擇器、Status、Theme Switcher、Snippet、Tags，檔頭註明改動），重新安裝會蓋掉這些修改。
- 介面字型為本地打包的 jf open 粉圓（Huninn，OFL-1.1）。聊天室主題可選的字型（粉圓、思源黑體／宋體 variable、JetBrains Mono）也全部本地打包，由 `@chatto/chat-ui/fonts` 載入，字型堆疊集中在 `packages/chat-ui/src/fontStacks.ts`。不從 Google Fonts 等外部載入。
- 聊天渲染用純 CSS 加 CSS 變數（`chat.css`），不依賴 Tailwind，確保自訂 CSS 好寫、OBS 載入輕量。
- Electron + electron-vite、`ws` 作為本機 WebSocket server、electron-builder 打包。
- 測試：Vitest（單元、元件，jsdom + Testing Library）、Playwright（網頁 E2E、視覺回歸、Electron）。格式：Prettier（見 `.prettierrc`）。分層與寫法見 `docs/testing.md`。

## 常用指令

```bash
npm install
npm run dev          # 啟動桌面 App（含 viewer）
npm run dev:viewer   # 只開 viewer，瀏覽器開 /overlay?mock=1 預覽
npm run typecheck
npm test             # Vitest 單元與元件測試
npm run test:e2e     # Playwright 網頁 E2E
npm run test:visual  # 視覺回歸
npm run test:electron  # 建置後測試 Electron App
npm run dist         # 打包 Windows 安裝檔
```

## 開發與驗證

- 能在瀏覽器驗證的 UI（viewer、控制台頁面）先用網頁模式加 mock 資料驗證。
- 透明、置頂、滑鼠穿透這類原生行為，要在使用者的 Windows 桌面上實測。
- 完成功能前執行 `npm run typecheck` 與 `npm test`；動到 UI 時加跑 `npm run test:e2e` 與 `npm run test:visual`，動到 main process 或視窗時加跑 `npm run test:electron`。
- 新功能要附測試：純邏輯寫單元測試、React 元件寫元件測試、跨頁流程寫 E2E。修 bug 時先寫一個會失敗的測試。
- 外觀刻意改變時，用 `npm run test:visual:update` 更新基準截圖，並在 commit 中一起提交；更新前先看過差異。
- 原生行為（透明、穿透）只能部分自動化，仍要在 Windows 桌面實測。

## Git

- 使用 Conventional Commits（`feat:`、`fix:`、`docs:`、`refactor:`、`chore:` …），scope 用 package 名，例如 `feat(provider-twitch): ...`。
- **commit message 不得加入 `Co-Authored-By` 或 `Claude-Session` 行。**
- 不提交 `.env`、token、建置產物（`out/`、`dist/`、`release/`）。
