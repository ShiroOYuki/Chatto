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

| 方法與路徑                                                                                                | 用途                                     | 帳號               |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------ |
| `GET /v1/themes?sort&category&search&page`                                                                | 列表（每頁 24）                          | 選填（標示按過讚） |
| `GET /v1/codes/:code`                                                                                     | 用代碼找主題                             | 選填               |
| `GET /v1/themes/:id`                                                                                      | 詳細資料＋主題 JSON                      | 選填               |
| `POST /v1/versions` `{ ids }`                                                                             | 已安裝主題的最新版本號                   | —                  |
| `GET /v1/assets/:file`、`PUT /v1/assets/:file`                                                            | 圖片外框（`<sha256>.<ext>`）；上傳要帳號 | 上傳要             |
| `GET /v1/thumbnails/:file`                                                                                | 縮圖                                     | —                  |
| `POST /v1/themes/:id/downloads` `{ clientId }`                                                            | 下載數（同一個匿名 id 每天算一次）       | —                  |
| `PUT`／`DELETE /v1/themes/:id/like`                                                                       | 按讚、收回                               | 要                 |
| `POST /v1/themes/:id/reports` `{ reason, note }`                                                          | 檢舉（每帳號一次）                       | 要                 |
| `POST /v1/themes`、`PUT /v1/themes/:id`、`DELETE /v1/themes/:id`                                          | 投稿、更新、下架                         | 要                 |
| `POST /v1/auth/sign-in` `{ provider }`、`POST /v1/auth/poll` `{ requestId }`、`POST /v1/auth/sign-out`    | 登入流程                                 | 綁定時要           |
| `GET /v1/auth/start/:state`、`GET /v1/auth/callback/:provider`                                            | 瀏覽器那一段                             | —                  |
| `GET`／`PATCH`／`DELETE /v1/account`、`DELETE /v1/account/identities/:provider`、`GET /v1/account/themes` | 帳號                                     | 要                 |
| `GET /v1/moderation/reports`、`PUT /v1/moderation/themes/:id`、`PUT /v1/moderation/accounts/:id`          | 管理                                     | 管理者             |

改 API 時舊版 App 要能用：只加欄位與端點，會壞掉的改動開 `/v2`。

## 重要的設計

- **登入**：App 呼叫 `sign-in` 拿到 `requestId`（只有 App 知道，D1 只存雜湊）與 `url`（帶另一個隨機 `state`），開系統瀏覽器；Worker 轉到平台登入頁，平台導回 `callback`，Worker 用 client secret 換 token、讀使用者 id 與名稱，**用完就撤銷 token、不保存**。App 每 1.5 秒 `poll`，完成時拿到 session token；那一筆紀錄在被讀到後刪除。只讀 user id 與顯示名稱，不要 email（Google scope `openid profile`、Discord `identify`、Twitch 不要 scope）。
- **Session token** 是 32 bytes 隨機值，D1 只存 SHA-256；180 天沒用就失效；登出、刪除帳號時刪除。
- **投稿**：App 先把每張圖片 `PUT /v1/assets/<sha256>.<ext>`（Worker 驗證檔名就是內容的雜湊、格式是 PNG／WebP／GIF、2 MB 以內），主題 JSON 裡只放 `asset:` 參照；Worker 拒絕主題內的 data URL（`image-inline`）與還沒上傳的圖片（`image-missing`）。接著跑和 App 相同的 `checkPublish`，再扣每日 10 次的額度。主題 JSON 存 R2 `themes/<id>.json`（只留最新版），縮圖 `thumbnails/<id>-<version>.png`，圖片 `assets/<file>`。
- **隱藏規則**：管理者隱藏、作者被封鎖，或檢舉帳號數 ≥ 3 且 > 下載數 5%（管理者恢復時清掉當時的檢舉數）。被隱藏的主題只有作者與管理者看得到。
- **隱私**：下載去重用的匿名 id 與限速用的 IP 都以 `HASH_SALT` 加鹽雜湊；`download_marks` 每天清掉（數字留在主題上），`rate_limits` 幾分鐘後清掉。
- **排程**：每 10 分鐘清限速計數、過期登入、舊的下載標記、過期 session；每天 03:17（UTC）另外刪除超過一天沒有主題使用的圖片。
- **快取**：沒帶帳號的 `GET /v1/themes`、`/v1/codes/:code` 在 Cloudflare 邊緣快取 60 秒；圖片與縮圖檔名含內容雜湊或版本，永久快取。

## 本機開發

```bash
cp apps/share-worker/.dev.vars.example apps/share-worker/.dev.vars   # 填入要測的平台 client id／secret
npm run db:migrate:local -w @chatto/share-worker
npm run dev -w @chatto/share-worker      # http://localhost:8787
```

- 要讓 App 連本機服務：在 `apps/desktop/.env` 加 `MAIN_VITE_SHARE_API_URL=http://localhost:8787`，再 `npm run dev`。沒設定時 App 用記憶體假服務（`main/share-backend.ts`）。
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
7. **App 改用真正的服務**：`main/share-backend.ts` 的預設從假服務改成 `SHARE_API_URL`（開發版仍可用 `MAIN_VITE_SHARE_API_URL` 指向本機），發新版。

## 資料怎麼刪

- 使用者刪除帳號：帳號、登入方式、session、按讚與檢舉都刪除（計數同步扣掉），主題保留、作者顯示為匿名。
- 作者或管理者下架主題：D1 紀錄、R2 主題 JSON 與縮圖刪除；圖片在每日清理時，沒有其他主題使用就刪除。
