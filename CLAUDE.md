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
  share/            @chatto/share — 主題分享的資料型別、檢查規則、ShareBackend、HTTP 協定與用戶端、假服務（App 與 Worker 共用）
apps/
  viewer/           @chatto/viewer — /overlay 與 /embed 頁面，由桌面 App 的本機 server 提供；瀏覽器可用 ?mock=1 獨立預覽
  desktop/          @chatto/desktop — Electron（electron-vite）：main / preload / renderer（控制台）
  share-worker/     @chatto/share-worker — 主題分享服務（Cloudflare Worker＋D1＋R2），不打包進 App
  site/             @chatto/site — chattolive.com 靜態網站（首頁、主題、教學、常見問題、更新紀錄、隱私說明、使用條款，繁中＋英文，亮暗色），Cloudflare Workers 靜態資源
obs-plugin/         obs-chatto — OBS 外掛「Chatto 聊天室」來源（C++，CMake，Windows；不在 npm workspaces 裡）
docs/               architecture.md、message-format.md、theming.md、testing.md、design.md、visual-identity.md、share-service.md
```

資料流：`Provider → ChatHub（main process）→ 本機 WebSocket → viewer（overlay 視窗與 OBS）`；控制台透過 IPC 與 main 溝通。

- 三個輸出 target：`overlay`（桌面聊天室）、`embed`（OBS）、`alerts`（桌面事件 Overlay）。每個 target 收到什麼由 `AppController.route()` 決定（見 `docs/architecture.md`「輸出路由」）；只給實況主看的東西（沉寂提醒標記、事件卡片）不得送到 `embed`。
- 事件提醒規則分「通用」（跨平台分類 `ALERT_CATEGORIES`）與各平台專屬事件；新增平台事件時，能對應到通用分類就在 `EVENT_CATALOG` 填 `alertCategory`。
- OBS 外掛只是包住 embed 頁的私有 obs-browser 來源，不自己畫聊天室；它讀 `/api/ping`、`/api/themes`，用 `/embed?theme=<id>` 選主題（見 `docs/architecture.md`）。這兩個 API 和 `?theme=` 是外掛的公開介面，改動要相容。模組名 `obs-chatto`、來源類型 id `chatto_chat` 會存進使用者的場景，不能改名。
- App 更新：`electron-updater`（`apps/desktop/src/main/updater.ts`）讀最新**已發佈**的 GitHub Release，只提示，使用者同意才下載；開發版不檢查。
- 帳號頁（`pages/accounts/`）是所有帳號的統一入口：上半 Chatto 帳號（分享用）、下半直播平台（登入與頻道連線）；左側欄底部的帳號卡也開這一頁。兩者只在介面合併，底層仍分開。探索頁不放帳號管理。
- 主題分享（「探索」頁，GitHub #4）：資料型別、檢查規則、`ShareBackend` 與 HTTP 協定在 `packages/share`，App 端流程是 `apps/desktop/src/shared/share/client.ts`（`ShareClient`），服務是 `apps/share-worker`。App 裡 `ShareClient` 在 main process，session token 不離開 main；控制台經 IPC `share:call`（`SHARE_METHODS`）呼叫。服務部署在 `api.chattolive.com`：打包版連正式服務，開發版預設用記憶體內的假服務（`@chatto/share/fake`），`MAIN_VITE_SHARE_API_URL`（建置時）或 `CHATTO_SHARE_API`（執行時）可設成網址或 `fake`。分享帳號和聊天室連線分開，不得使用聊天平台的 token。API 只能向後相容地擴充（舊版 App 要能用）。見 `docs/architecture.md`「主題分享」與 `docs/share-service.md`。
- 分享條款、隱私說明與 App 免責聲明的文字只有一份：`packages/share/src/legalText.ts`，App（`shareTerms`、`legal` 訊息）與網站（`apps/site`）都從這裡讀。改分享條款或隱私說明要遞增 `SHARE_TERMS_VERSION` 與 `LEGAL_UPDATED`，網站會在推到 `main` 時由 `site.yml` 自動部署（也可手動 `npm run deploy -w @chatto/site`）。
- 提醒邏輯（沉寂偵測、事件規則）是 `apps/desktop/src/main/alerts.ts` 的純函式；內建提示音是從 soundcn 收進來的 CC0 音效（`packages/chat-ui/src/soundcn/`，由 `sounds.ts` 動態載入）；只能收 CC0 音效，並記到 `THIRD_PARTY_NOTICES.md`，不得使用 soundcn 的 Blizzard 音效。

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
- 內建預設：抹茶玻璃、和紙、泡泡、極簡描邊、暖簾、終端機、茶葉框，全部只覆蓋基底參數；另有 `blank`（`base: 'blank'`，不產生任何樣式，只留結構與 `customCss`）。
- 新增參數時要同時：更新 `BASE_THEME` 預設值、`themeToCss`、編輯器欄位、`docs/theming.md`，並在 `normalizeTheme` 補舊資料的預設。
- 使用者可以選預設、逐項精細調整（四邊內距、四角圓角、框線、陰影、模糊、九宮格圖片外框、身分樣式等）、寫自訂 CSS、匯出／匯入（JSON，或含圖片的主題包 `.chattotheme`）。Overlay 與 Embed 可以各自使用不同主題。
- 圖片外框（`BoxStyle.image`、`roles.<身分>.frame`）的圖片存在 userData `theme-assets/<sha256>.<ext>`，主題裡只存 `asset:<檔名>`，本機 server 在 `/theme-assets/` 提供（不要用 `/assets/`，那是 viewer 建置檔的路徑）。只收 PNG／WebP／GIF，依內容判斷格式，不收 SVG。控制台裡的 `ChatView` 要傳 `assetUrl={useThemeAssetUrl()}`。內建主題的圖片用 data URL 內嵌，必須自製或 CC0。
- **平台事件**：以 `平台:事件` 識別（如 `twitch:cheer`），清單集中在 `packages/chat-ui/src/events.ts` 的 `EVENT_CATALOG`，編輯器的「<平台> 專屬元件」選單由它產生。`theme.notice` 是通用事件訊息；`theme.events[key]` 為 `{ linked, style }`，linked 時持續跟隨通用樣式，編輯即解除連動。新增平台事件時：provider mapper 設 `eventType`、在 `events.ts` 的 `EVENT_CATALOG` 加定義、在 `eventSamples.ts` 加預覽範例（`events.ts` 只放定義，不依賴 mock 資料）、更新 `docs/message-format.md`。
- 可客製元素的說明集中在 `packages/chat-ui/src/reference.ts`（編輯器的 class 標籤、自動完成、檢查標籤，以及「在 VSCode 開啟」產生的 `chatto-reference.css`、`css.customData` 都用它），新增 class、屬性或 CSS 變數時同步更新。
- 主題編輯器的預覽有「範例」（`createSpecimenEvents()`，涵蓋所有元件與事件）與「即時」兩種模式，並提供檢查模式與選擇器建構器；自訂 CSS 使用 CodeMirror 6。「範例」可開「只看目前區塊」：區塊在 `sections.tsx` 以 `focus` 指定對應的範例列，篩選是 `lib/specimenFocus.ts` 的純函式；新增區塊或範例時一併確認對應。
- 控制台裡的聊天預覽用 `all: revert` 隔離 Tailwind preflight，確保預覽與 OBS 實際畫面一致。
- 所有可被客製的元素使用穩定的 `chatto-*` class 與 `data-*` 屬性，視為公開 API，改名屬於破壞性變更。

## 控制台 App UI 方向

- 視覺與互動的細則（色彩 token、字級、圓角與間距、kit 元件的用法、狀態回饋、動畫、吉祥物）見 `docs/design.md`，新增或修改介面前先看。
- 品牌概念、色彩意象、茶杯吉祥物的造型、插圖與內建主題的美術方向見 `docs/visual-identity.md`；畫新素材、改吉祥物或新增內建主題前先看。
- 兩種介面模式：**完整模式**（左側導覽：總覽、聊天室、主題、探索、輸出、提醒、帳號、設定）與**精簡模式**（單頁 Bento 控制台），由標題列或設定切換，存在 `prefs.uiMode`。
- 設定頁分「一般」「外觀」「進階」「關於」四個區塊，用左側選單（kit `SideNavItem`，主題編輯器共用）切換。
- 主視窗為 frameless，自繪標題列並整合最小化／最大化／關閉；關閉行為依 `prefs.closeToTray` 決定縮到系統匣或結束。
- 版面採 **Bento 格狀**，整體**簡潔直觀**。
- **可愛元素只在適當處點綴**：茶杯吉祥物、空狀態插圖、連線成功的小動畫、親切的提示文字。不能干擾操作，也不能降低資訊密度的可讀性。
- 主色系為抹茶綠，需支援亮色與暗色。
- 文案簡短、動詞開頭，不使用驚嘆號堆疊；繁體中文與英文都遵守。

### 控制台 renderer 分層

- **`services/`** 是唯一呼叫 IPC `api` 的地方（`store.tsx` 負責訂閱狀態）。頁面與元件只呼叫 services，不得 import `api`，`layering.test.ts` 會檢查。不需要等待結果的動作用 `runAction` 執行：登入、連線的錯誤由 main 寫進 `AppState` 顯示，其他錯誤記錄到 console，不會變成未處理的 rejection。
- 由狀態推導的判斷（例如 `twitchStatus(state)` 的 signedIn／connected／busy）放在 services，完整模式與精簡模式共用，不要各自重寫。
- 大頁面拆成資料夾，例如 `pages/theme-editor/`：狀態 hook（`useThemeDraft`、`usePreviewHighlight`）、純函式（`draft.ts`，有單元測試）、各區塊面板（`panels/`）、參數欄位（`fields/`）。只給單一頁面用的元件放在該頁資料夾，多處共用的才放 `components/`。
- 主題草稿用型別化的 `set('author', 'box')(value)`（`PathSetter`）更新，路徑或值的型別錯了會直接編譯失敗。

- 贊助連結（Ko-fi、綠界）集中在 `apps/desktop/src/shared/support.ts`，改動時同步 `README.md` 與 `.github/FUNDING.yml`。

## 多語系

- 支援繁體中文（`zh-TW`）與英文（`en`，預設），首次啟動依系統語言：中文系統用繁中，其他用英文，清單在 `@chatto/core` 的 `LOCALES`。兩個設定：`prefs.locale`（介面：控制台、系統匣、對話框、main 丟給畫面的錯誤）與 `prefs.chatLocale`（`auto` 跟隨介面，或指定語言：桌面 Overlay、OBS、事件 Overlay 的事件文字）。聊天室語言由 WebSocket 的 `hello.locale` 與 `locale` frame 傳給 viewer。
- **不得在元件裡寫死介面文字。** 控制台文字放在 `apps/desktop/src/renderer/src/i18n/messages/<namespace>.ts`，用 `defineMessages()` 同時寫繁中與英文（英文的結構由型別檢查必須和繁中一致），元件用 `useMessages().<namespace>`；main process 的文字在 `apps/desktop/src/main/messages.ts`。新增 namespace 要在 `i18n/index.ts` 註冊。
- 主題名稱用 `useThemeName()`；控制台裡的聊天預覽要傳 `locale={useChatLocale()}`，主題經過 `useOutputTheme()`，才會和 OBS 看到的一樣。
- 事件文字不翻譯平台原文，而是用 `ChatNotice.meta` 的結構化欄位套模板（`@chatto/chat-ui` 的 `eventText.ts`、`EVENT_CATALOG` 的 `text`／`variables`）；組不出來時顯示 `systemText`。新增平台事件時要寫兩種語言的模板，provider 要把需要的欄位放進 `meta`，並更新 `docs/message-format.md`「事件欄位」。主題的 `eventText` 可覆寫模板。
- `@chatto/chat-ui` 裡給介面用的說明（`EVENT_CATALOG` 的名稱與說明、`ALERT_CATEGORIES`、`reference.ts`）是 `Localized` 物件，用 `x[locale]` 取。
- 內建主題的名稱與預設文字由 `localizeTheme()` 依語言替換；使用者自訂主題的文字不動。

## 技術棧

- TypeScript（strict）、React 19、Vite、Tailwind CSS v4（控制台與 viewer 外框）。
- 動畫用 **Motion**（`motion/react`），共用彈簧與元件集中在 `apps/desktop/src/renderer/src/components/motion.tsx`。**不使用 Animate UI**：其 MIT + Commons Clause 授權與 GPL 不相容。新增第三方套件前先確認授權與 GPL-3.0 相容，並更新 `THIRD_PARTY_NOTICES.md`。
- 元件：**shadcn/ui + Radix**（互動元件）與 **Magic UI**（特效）放在 `apps/desktop/src/renderer/src/components/ui/`，**Kibo UI**（進階元件：顏色選擇器、Status、Pill、Snippet、Theme Switcher、Spinner、Choicebox、Tags）放在 `components/kibo-ui/`。Kibo 沒有基礎元件，Switch、Tabs、Button、Input、Select、Slider、Tooltip 等一律用 shadcn/ui；Chatto 自己的包裝在 `components/kit/`（依用途分檔，由 `kit/index.ts` 統一匯出），頁面優先使用 kit。新增元件時在 `apps/desktop` 執行 `npx shadcn@latest add <name>` 、`npx shadcn@latest add @magicui/<name>` 或 `npx shadcn@latest add @kibo-ui/<name>`，之後檢查 `import { cn } from "cn"` 要改回 `@/lib/utils`，並移除 CLI 多裝的 `cn`、`next-themes` 套件；CLI 若詢問是否覆寫既有的 `ui/` 元件，不要覆寫。複製進來的 Kibo 元件有些已改寫（顏色選擇器、Status、Theme Switcher、Snippet、Tags，檔頭註明改動），重新安裝會蓋掉這些修改。
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
npm run build:obs-plugin  # 建置 OBS 外掛到 obs-plugin/release（需要 VS 2022 Build Tools 的 C++ 與 Windows SDK）
npm run dist         # 打包 Windows 安裝檔（會先建置 OBS 外掛）
```

## 開發與驗證

- 能在瀏覽器驗證的 UI（viewer、控制台頁面）先用網頁模式加 mock 資料驗證。
- 透明、置頂、滑鼠穿透這類原生行為，要在使用者的 Windows 桌面上實測。
- 完成功能前在本機執行 `npm run typecheck` 與 `npm test`，再只跑和改動相關的 Playwright 測試（`npx playwright test --project=web --workers=2 -g "<英文片段>"` 或指定 spec 檔）；新寫的測試先單獨跑通過。完整的 web E2E、視覺回歸、Electron 測試交給 CI（`develop` → `CI` 的 PR），本機不必全跑。
- 新功能要附測試：純邏輯寫單元測試、React 元件寫元件測試、跨頁流程寫 E2E。修 bug 時先寫一個會失敗的測試。
- 外觀刻意改變時，在本機只更新受影響的基準截圖（`npx playwright test --project=visual --workers=2 --update-snapshots=all <spec 檔> [-g "<英文片段>"]`），比對新舊差異，只有雜訊的檔案還原，其餘和程式一起提交。
- CI 的視覺回歸意外失敗時，用 `gh run download <run id> -n playwright-report` 取回 `-expected`／`-actual`／`-diff` 圖判斷：是 bug 就修；是預期的改變就在本機只對失敗的測試更新基準截圖。不要拿 CI 的 `-actual` 當基準。
- 原生行為（透明、穿透）只能部分自動化，仍要在 Windows 桌面實測。

## Git

- 使用 Conventional Commits（`feat:`、`fix:`、`docs:`、`refactor:`、`chore:` …），scope 用 package 名，例如 `feat(provider-twitch): ...`。
- **commit message 不得加入 `Co-Authored-By` 或 `Claude-Session` 行。**
- 不提交 `.env`、token、建置產物（`out/`、`dist/`、`release/`）。
- 分支依 `feature/*` → `develop` → `CI` → `main` 合併。新工作開 `feature/<名稱>` 分支，完成後併入 `develop`；`develop` 不跑 workflow，`CI` 跑測試，`main` 跑測試並發佈（版本號沒有對應 tag 時，自動打 tag 並建立草稿 Release，說明由 `apps/site/src/changelog.mjs` 產生，發版前要先把「下一版」改成這個版本；按下發佈後網站自動部署）。`CI`、`main` 有分支保護，只能透過 PR 合併。
- 預設分支是 `main`，commit 裡的 `Closes #N` 要等合併到 `main` 才會關閉 issue。
