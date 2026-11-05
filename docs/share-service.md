# 主題分享服務（GitHub #4）

「探索」頁背後的服務：Cloudflare Worker（`apps/share-worker`）＋ D1（帳號、主題資料、計數）＋ R2（主題 JSON、圖片、縮圖）。App 端的流程與介面見 `docs/architecture.md`「主題分享」。

## 程式在哪裡

| 位置                                | 內容                                                                                                                                                                                                                                         |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/share`（`@chatto/share`） | App 與 Worker 共用：資料型別（`model.ts`）、檢查規則（`rules.ts`）、`ShareBackend` 介面（`backend.ts`）、HTTP 協定（`protocol.ts`：路徑、狀態碼、上限、備用網址）、HTTP 用戶端（`@chatto/share/http`）、記憶體假服務（`@chatto/share/fake`） |
| `apps/share-worker/src`             | Worker：`app.ts`（路由）、`signin.ts`＋`oauth.ts`（登入）、`accounts.ts`（session、帳號）、`themes.ts`（瀏覽、投稿、計數）、`moderation.ts`、`limits.ts`（限速）、`cleanup.ts`（排程清理）、`pages.ts`（登入完成頁）                         |
| `apps/share-worker/migrations`      | D1 schema（`wrangler d1 migrations`）                                                                                                                                                                                                        |
| `apps/share-worker/test/fakes.ts`   | 測試用的 D1（Node 內建 SQLite）與 R2（記憶體）                                                                                                                                                                                               |
| `share.json`                        | 備用網址：App 連不到 `api.chattolive.com` 時讀 `main` 上的這個檔案                                                                                                                                                                           |

## API（`/v1`）

每個 JSON 回應都是 `ShareResult`（`{ ok: true, value }` 或 `{ ok: false, error, issues? }`），HTTP 狀態碼對應錯誤碼（`SHARE_ERROR_STATUS`）。需要帳號的呼叫帶 `Authorization: Bearer <session token>`。

| 方法與路徑                                                                                                                    | 用途                                     | 帳號               |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------ |
| `GET /v1/themes?sort&category&search&page`                                                                                    | 列表（每頁 24）                          | 選填（標示按過讚） |
| `GET /v1/codes/:code`                                                                                                         | 用代碼找主題                             | 選填               |
| `GET /v1/themes/:id`                                                                                                          | 詳細資料＋主題 JSON                      | 選填               |
| `POST /v1/versions` `{ ids }`                                                                                                 | 已安裝主題的最新版本號                   | —                  |
| `GET /v1/assets/:file`、`PUT /v1/assets/:file`                                                                                | 圖片外框（`<sha256>.<ext>`）；上傳要帳號 | 上傳要             |
| `GET /v1/thumbnails/:file`                                                                                                    | 縮圖                                     | —                  |
| `POST /v1/themes/:id/downloads` `{ clientId }`                                                                                | 下載數（同一個匿名 id 每天算一次）       | —                  |
| `PUT`／`DELETE /v1/themes/:id/like`                                                                                           | 按讚、收回                               | 要                 |
| `POST /v1/themes/:id/reports` `{ reason, note }`                                                                              | 檢舉（每帳號一次）                       | 要                 |
| `POST /v1/themes`、`PUT /v1/themes/:id`、`DELETE /v1/themes/:id`                                                              | 投稿、更新、下架                         | 要                 |
| `POST /v1/auth/sign-in` `{ provider, port, challenge }`、`POST /v1/auth/token` `{ code, verifier }`、`POST /v1/auth/sign-out` | 登入流程                                 | 綁定時要           |
| `GET /v1/auth/start/:state`、`GET /v1/auth/callback/:provider`                                                                | 瀏覽器那一段                             | —                  |
| `GET`／`PATCH`／`DELETE /v1/account`、`DELETE /v1/account/identities/:provider`、`GET /v1/account/themes`                     | 帳號                                     | 要                 |
| `GET /v1/moderation/reports`、`PUT /v1/moderation/themes/:id`、`PUT /v1/moderation/accounts/:id`                              | 管理                                     | 管理者             |

改 API 時舊版 App 要能用：只加欄位與端點，會壞掉的改動開 `/v2`。

## 重要的設計

- **登入（本機回呼＋PKCE）**：App 在 `127.0.0.1` 的隨機 port 開一個臨時頁面（`main/share-loopback.ts`），產生 PKCE verifier，呼叫 `sign-in` 送出登入方式、port 與 challenge，拿到 `url`（帶隨機 `state`）後開系統瀏覽器。Worker 轉到平台登入頁；平台導回 `callback` 時，Worker 用 client secret 換 token、讀使用者 id 與名稱（**用完就撤銷 token、不保存**），再把瀏覽器導回 `http://127.0.0.1:<port>/chatto-sign-in?code=<一次性代碼>`（失敗時是 `?error=`）。App 收到代碼後以 `token` 端點連同 verifier 換 session。**帳號的建立與綁定都在這一步才做**：把登入連結轉傳給別人沒有用，代碼會落在對方電腦上，而 verifier 只在發起的 App 裡；代碼只能用一次。只讀 user id 與顯示名稱，不要 email（Google scope `openid profile`、Discord `identify`、Twitch 不要 scope）。
- **Session token** 是 32 bytes 隨機值，D1 只存 SHA-256；180 天沒用就失效；登出、刪除帳號時刪除。
- **投稿**：App 先把每張圖片 `PUT /v1/assets/<sha256>.<ext>`（Worker 驗證檔名就是內容的雜湊、格式是 PNG／WebP／GIF、2 MB 以內），主題 JSON 裡只放 `asset:` 參照；Worker 拒絕主題內的 data URL（`image-inline`）與還沒上傳的圖片（`image-missing`）。接著跑和 App 相同的 `checkPublish`，再扣每日 10 次的額度。主題 JSON 存 R2 `themes/<id>.json`（只留最新版），縮圖 `thumbnails/<id>-<version>.png`，圖片 `assets/<file>`。
- **隱藏規則**：管理者隱藏、作者被封鎖，或檢舉帳號數 ≥ 3 且 > 下載數 5%（管理者恢復時清掉當時的檢舉數）。被隱藏的主題只有作者與管理者看得到。
- **備用網址**：App 只會跟著 `share.json` 換到 `chattolive.com` 與它的子網域（`isShareServiceUrl`），session token 不會被送到別處。
- **隱私**：下載去重用的匿名 id 與限速用的 IP 都以 `HASH_SALT` 加鹽雜湊；`download_marks` 每天清掉（數字留在主題上），`rate_limits` 幾分鐘後清掉。
- **排程**：每 10 分鐘清限速計數、過期登入、舊的下載標記、過期 session；每天 03:17（UTC）另外刪除超過一天沒有主題使用的圖片。
- **快取**：沒帶帳號的 `GET /v1/themes`、`/v1/codes/:code` 在 Cloudflare 邊緣快取 60 秒；圖片與縮圖檔名含內容雜湊或版本，永久快取。

## 本機開發

```bash
cp apps/share-worker/.dev.vars.example apps/share-worker/.dev.vars   # 填入要測的平台 client id／secret
npm run db:migrate:local -w @chatto/share-worker
npm run dev -w @chatto/share-worker      # http://localhost:8787
```

- App 連哪個服務由 `main/share-backend.ts` 的 `pickShareService` 決定：**打包版連正式服務**，**開發版預設用記憶體假服務**（不會寫進正式資料）。要改就設 `MAIN_VITE_SHARE_API_URL`（`apps/desktop/.env`，建置時）或 `CHATTO_SHARE_API`（執行時，Electron 測試用 `fake`），值是網址或 `fake`；連本機服務用 `http://localhost:8787`。
- 平台的 OAuth 應用程式要加上 `http://localhost:8787/v1/auth/callback/<provider>` 才能在本機登入。
- 測試：`npx vitest run packages/share apps/share-worker`（不需要 Workers runtime）。

## 上線步驟（一次性，需要 Ciel 操作）

1. **Cloudflare 資源**（在 `apps/share-worker` 執行，先 `npx wrangler login`）：
   - `npx wrangler d1 create chatto-share`，把輸出的 `database_id` 填進 `wrangler.toml`。
   - `npx wrangler r2 bucket create chatto-share`。
2. **三個平台的 OAuth 應用程式**，Redirect URI 分別是：
   - Twitch（dev.twitch.tv/console，Category 選 Website Integration、Client Type 選 Confidential）：`https://api.chattolive.com/v1/auth/callback/twitch`
   - Google（Google Cloud Console → APIs & Services → Credentials → OAuth client ID，Web application；同意畫面只要 `openid`、`profile`）：`https://api.chattolive.com/v1/auth/callback/google`
   - Discord（discord.com/developers → OAuth2）：`https://api.chattolive.com/v1/auth/callback/discord`
   - 這個 Twitch 應用程式和聊天室用的公開客戶端分開。
3. **Worker secrets**（`npx wrangler secret put <名稱>`）：`HASH_SALT`（隨機長字串，之後不要改，改了會讓今天的下載去重失效）、`TWITCH_CLIENT_ID`、`TWITCH_CLIENT_SECRET`、`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`DISCORD_CLIENT_ID`、`DISCORD_CLIENT_SECRET`。
4. **第一次部署**：`npm run deploy -w @chatto/share-worker`（套用 migration 後部署，Custom Domain `api.chattolive.com` 會自動建立）。確認 `https://api.chattolive.com/v1/themes` 回 `{"ok":true,...}`。
5. **GitHub 自動部署**：repository secrets `CLOUDFLARE_API_TOKEN`（權限：Workers Scripts Edit、D1 Edit、Workers R2 Storage Edit、Workers Routes／Custom Domains）、`CLOUDFLARE_ACCOUNT_ID`；repository variable `SHARE_DEPLOY=true`。之後推到 `main` 且 Worker 相關檔案有改時，`.github/workflows/share-worker.yml` 會測試並部署。
6. **管理者帳號**：在 App 登入一次後，`npx wrangler d1 execute chatto-share --remote --command "UPDATE accounts SET role = 'moderator' WHERE id = '<帳號 id>'"`（帳號 id 可用 `SELECT a.id, a.display_name, i.provider, i.name FROM accounts a JOIN identities i ON i.account_id = a.id` 查）。
7. **App 改用真正的服務**：已完成，打包版預設連 `SHARE_API_URL`。

## 網站 chattolive.com

`apps/site` 是純靜態網站（Workers 靜態資源，沒有 Worker 程式），亮色與暗色跟隨訪客的系統設定。英文在 `/`，繁中在 `/zh-tw/` 底下，頁面相同：

| 路徑                                                | 內容                                                            |
| --------------------------------------------------- | --------------------------------------------------------------- |
| `/`                                                 | 首頁：開頭、功能、主題、三步開始、常見問題、最新兩版更新紀錄    |
| `/themes`                                           | 七種內建主題的意象、色彩、形狀、動態與預覽，以及可調整的項目    |
| `/guide`                                            | 使用教學：安裝、連上頻道、桌面浮層、放進 OBS、調整主題、提醒    |
| `/faq`                                              | 常見問題，依分類                                                |
| `/changelog`、`/changelog/themes`、`/changelog/obs` | 更新紀錄：Chatto、Chatto Themes（主題分享）、Chatto OBS（外掛） |
| `/privacy`、`/terms`                                | 隱私說明與使用條款                                              |

- `src/content.mjs`：所有頁面的文案（兩種語言結構相同）。
- `src/changelog.mjs`：三個產品的更新紀錄，新的在前，**也是 GitHub Release 說明的來源**（#26）。`upcoming: true` 是 `develop` 上還沒發佈的內容，顯示成「下一版」。**發版時**把 `upcoming` 那筆改成版本號與日期，Chatto 的版本加上 `download: true`；OBS 外掛的紀錄用 `chatto` 標出隨哪個 Chatto 版本附上。
- `src/releaseNotes.mjs`：`node apps/site/src/releaseNotes.mjs v0.2.0` 輸出那個版本的 Release 說明（英文在前、`## 繁體中文` 在後，附上同版的 OBS 外掛）。`release.yml` 在建置前執行它，沒有這個版本的紀錄就失敗；`gh release create --notes-file … --generate-notes` 把 GitHub 的變更清單接在後面。
- 建置時讀 GitHub 上**已發佈**的 Release（有 `GITHUB_TOKEN` 就帶上）：有版本號但還是草稿的紀錄顯示「尚未發佈」、沒有下載按鈕，首頁也不列。讀不到時本機當成都已發佈並警告，CI 則失敗。
- `src/build.mjs` 把上面兩份文案和 `packages/share/src/legalText.ts` 的條款、免責聲明組成 HTML。主題預覽是照 `packages/chat-ui/src/themes.ts` 的參數用 CSS 畫的近似樣子（`styles.css` 的 `.tp-<主題 id>`），改內建主題的顏色或形狀時一起更新。
- 字型（粉圓、JetBrains Mono）從 `@fontsource` 複製，標誌從 `assets/` 複製並拿掉 C2PA metadata，茶杯在 `public/`。
- 版面依 `docs/visual-identity.md`：深抹茶色帶（頁首、主題列、頁尾）夾著奶白頁面，暗色時色帶維持深色。

```bash
npm run build -w @chatto/site      # 產生 apps/site/dist
npm run dev -w @chatto/site        # 本機預覽
npm run deploy -w @chatto/site     # 手動部署；第一次會建立 chattolive.com 與 www.chattolive.com 的 Custom Domain
```

**自動部署**：`.github/workflows/site.yml` 在 GitHub Release 發佈時、`main` 上網站相關檔案變動時（或手動）建置並部署，使用 secrets `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`。

Google OAuth 同意畫面的首頁、隱私權政策、服務條款填 `https://chattolive.com/`、`https://chattolive.com/privacy`、`https://chattolive.com/terms`。

## 資料怎麼刪

- 使用者刪除帳號：帳號、登入方式、session、按讚與檢舉都刪除（計數同步扣掉），主題保留、作者顯示為匿名。
- 作者或管理者下架主題：D1 紀錄、R2 主題 JSON 與縮圖刪除；圖片在每日清理時，沒有其他主題使用就刪除。
