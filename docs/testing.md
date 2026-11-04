# 測試

Chatto 的測試分成五層。越下層越快，能在下層測的就不要放到上層。

| 層       | 工具                              | 位置                       | 指令                    |
| -------- | --------------------------------- | -------------------------- | ----------------------- |
| 單元     | Vitest（node）                    | 各套件 `src/**/*.test.ts`  | `npm test`              |
| 元件     | Vitest（jsdom）＋ Testing Library | 各套件 `src/**/*.test.tsx` | `npm test`              |
| 網頁 E2E | Playwright（Chromium）            | `tests/e2e/web`            | `npm run test:e2e`      |
| 視覺回歸 | Playwright 截圖比對               | `tests/e2e/visual`         | `npm run test:visual`   |
| Electron | Playwright `_electron`            | `tests/e2e/electron`       | `npm run test:electron` |

`npm run test:all` 會依序跑型別檢查和全部五層。CI（`.github/workflows/ci.yml`）在 Windows runner 上跑同一套，推送或 PR 到 `CI`、`main` 時執行。

本機開發時只跑型別檢查、Vitest，以及和改動相關的 Playwright 測試（用 spec 檔或 `-g` 篩選，新寫的測試先單獨跑）；完整的 web E2E、視覺回歸、Electron 交給 CI。

## 單元測試

- 設定在根目錄的 `vitest.config.ts`，分成 `unit`（node）和 `dom`（jsdom）兩個 project。只跑其中一個：`npx vitest run --project unit`。
- **mapper、feed、主題 CSS 這類純函式**直接測輸入輸出。Twitch mapper 用錄下來的 payload。
- **網路**：用 `tests/fake-fetch.ts` 的 `installFakeFetch()`，依網址前綴排好回應，測試結束會自動還原。
- **WebSocket**：用 `tests/fake-websocket.ts` 的 `FakeWebSocket`（`vi.stubGlobal('WebSocket', FakeWebSocket)`），用 `serverOpen`／`serverSend`／`serverClose` 模擬伺服器端。
- **計時**：重連、輪詢、keepalive 用 `vi.useFakeTimers()` 加 `vi.advanceTimersByTimeAsync()`，不要真的等。
- **Electron main process**：用 `vi.mock('electron', ...)` 換掉 `app`、`safeStorage`、`nativeTheme`，檔案寫到 `mkdtempSync` 建的暫存資料夾。`AppController` 的測試把 provider、server、overlay 都換成假物件，只測狀態與流程。

## 元件測試

- 檔名用 `.test.tsx`，會自動進 jsdom project。`tests/setup-dom.ts` 補上 jsdom 缺的 `matchMedia`、`ResizeObserver`、pointer capture，並在每個測試後 `cleanup()`。
- 控制台元件透過 `api` 和 main process 溝通，測試時 mock 掉：

  ```ts
  vi.mock('../api', async () => {
    const { createFakeApi } = await import('../../../../../../tests/fake-api');
    return { api: createFakeApi(), isMockApi: false };
  });
  ```

  `createFakeApi()` 的每個方法都是 spy，`pushState()`／`pushChat()` 模擬 main process 推送。

- 用 role 和名稱找元素（`getByRole('switch', { name: '…' })`），順便確保可及性標籤正確。
- 不用 jest-dom matcher，直接比對 DOM 屬性，例如 `getAttribute('aria-checked')`。

## 網頁 E2E

- Playwright 會自動啟動 `npm run dev:web`（控制台，5175）與 `npm run dev:viewer`（viewer，5174）。本機已經開著的話會直接沿用。
- 控制台網址加 `?e2e`：關掉隨機假聊天，並提供 `window.__chattoMock.emitChat()`／`setState()`，讓測試推送確定的事件。`tests/e2e/fixtures.ts` 的 `panel` fixture 包好了這些操作。
- viewer 網址加 `?specimen`：固定顯示 `createSpecimenEvents()` 的範例訊息，不會變動；`&theme=<id>` 選擇預設主題。
- fixture 會擋掉所有對外連線、固定 `Math.random` 種子和時間，讓結果每次都一樣。

## 視覺回歸

- 每個預設主題各一張範例截圖，控制台每一頁在亮色和暗色下各一張。
- 主題編輯器每個區塊（含一個平台事件頁）各一張亮色截圖（`editor.spec.ts`），重構編輯器時用來確認畫面沒變。這個檔案固定在同一個 worker 依序執行：同時開很多個編輯器會拖慢機器，導致截圖逾時。
- 本機如果在高並行下出現大量逾時（`page.goto`、`document.fonts.ready`），先用 `--workers=2` 重跑，確認是不是機器負載造成的。
- 基準截圖放在 `tests/e2e/visual/__screenshots__/`，檔名帶平台（`-win32`），要一起 commit。
- 控制台截圖會遮住即時預覽和訊息速率圖，因為它們隨時間變化；主題外觀由主題截圖負責。
- 外觀刻意改變時：
  1. 只對受影響的 spec 更新：`npx playwright test --project=visual --workers=2 --update-snapshots=all <spec 檔>`，可加 `-g` 縮小範圍。
  2. 比對新舊截圖，確認差異都是預期的；`all` 也會重寫沒變的截圖（只有幾個像素的雜訊），這些檔案還原。
  3. 把更新的基準截圖和程式一起提交。其他畫面有沒有被意外影響，由 CI 的完整視覺回歸檢查。
- CI 的視覺回歸失敗時，失敗的 run 會上傳 `playwright-report` artifact（含 `test-results/`）。用 `gh run download <run id> -n playwright-report` 取回，看每張失敗截圖的 `-expected`、`-actual`、`-diff`：
  - 是 bug：修程式後推送，PR 會重跑。
  - 是預期的改變：在本機只對失敗的測試更新基準截圖並提交。不要直接用 CI 的 `-actual` 當基準，本機產生的才和其他基準一致。

## Electron

- 要先建置（`npm run test:electron` 會自動先跑 `npm run build`）。
- 每個測試用獨立的使用者資料夾（環境變數 `CHATTO_USER_DATA`，只在未打包時有效）和隨機 port，不會碰到真正的設定，也不會和正在執行的 Chatto 搶 port。
- 測試期間桌面上會短暫跳出 Chatto 視窗，這是正常的。
- 可以驗證：preload API、renderer 拿不到 token、本機 server、Overlay 視窗的置頂與可聚焦狀態、主題即時推送到 OBS、關閉縮到系統匣、設定寫入檔案。
- **沒辦法自動驗證**：透明背景實際的樣子、滑鼠穿透、在全螢幕遊戲上方是否可見。這些仍要在 Windows 桌面實測。

## 新增測試的原則

- 新功能附上測試；修 bug 時先寫一個會失敗的測試，再修程式。
- 刪除、封鎖事件「立即從畫面移除」是核心承諾，相關改動要同時有 feed／ChatHub 的單元測試和 E2E。
- 不要依賴真的 Twitch 或任何外部服務。
