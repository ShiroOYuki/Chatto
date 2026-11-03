# 標準化聊天格式（Schema v1）

定義在 `packages/core/src/message.ts`。所有平台都必須輸出這個格式；破壞性修改時遞增 `SCHEMA_VERSION`，並在這份文件最下方記錄變更。

## ChatEvent

viewer、主題、外掛唯一需要理解的資料流。

| type              | 內容                                 | 用途                                     |
| ----------------- | ------------------------------------ | ---------------------------------------- |
| `message`         | `ChatMessage`                        | 一般聊天訊息                             |
| `notice`          | `ChatNotice`                         | 訂閱、續訂、贈訂、揪團、公告、觀看連勝等 |
| `message-deleted` | `platform`、`channelId`、`messageId` | 單則訊息被刪除                           |
| `user-cleared`    | `platform`、`channelId`、`userId`    | 使用者被禁言或封鎖，清掉他所有訊息       |
| `chat-cleared`    | `platform`、`channelId`              | 整個聊天室被清空                         |
| `connection`      | `state`、`detail?`                   | 連線狀態                                 |

## ChatMessage

```ts
{
  id: string;              // 平台原生 id
  platform: 'twitch' | ...;
  channelId: string;
  timestamp: number;       // epoch ms
  author: ChatUser;
  fragments: MessageFragment[];
  text: string;            // = fragments 的 text 串接
  isAction: boolean;       // /me
  highlights: ('first-message' | 'highlighted' | 'after-silence' | ...)[];
  reply?: { parentMessageId, parentAuthor, parentText };
  cheerAmount?: number;
  eventType?: string;      // 這則訊息同時是平台事件時，例如 'cheer'、'highlighted'
}
```

`ChatNotice` 也有 `eventType?: string`（kebab-case，例如 `resub`、`community-gift`、`watch-streak`）。樣式鍵為 `${platform}:${eventType}`，例如 `twitch:cheer`；渲染器輸出為 `data-event` 屬性。各平台的事件清單見 `packages/chat-ui/src/events.ts`。

### 事件欄位（`ChatNotice.meta`）

provider 把事件的結構化資料整理成平台無關的 `meta` 鍵，事件文字模板（見 `docs/theming.md`「事件文字」）用它們組句。平台送來的 `systemText` 保留原文，模板組不出來時顯示它。

| 鍵                                | 型別                         | 用在                               | 說明                                   |
| --------------------------------- | ---------------------------- | ---------------------------------- | -------------------------------------- |
| `tier`                            | `string`                     | 訂閱、續訂、贈訂、Prime 轉付費     | `1`、`2`、`3`、`prime`                 |
| `months`                          | `number`                     | 續訂                               | 累計月數                               |
| `streakMonths`                    | `number`                     | 續訂                               | 連續月數；觀眾選擇不公開時沒有這個鍵   |
| `durationMonths`                  | `number`                     | 訂閱、續訂、贈訂                   | 一次買或送了幾個月（大於 1 才有）      |
| `recipient`                       | `string`                     | 贈訂                               | 收到者                                 |
| `count`                           | `number`                     | 大量贈訂                           | 這次送了幾份                           |
| `totalGifts`                      | `number`                     | 贈訂、大量贈訂                     | 送禮者在頻道累計送了幾份（匿名時沒有） |
| `gifter`                          | `string`                     | 收到的贈訂續訂、贈訂轉付費、傳下去 | 當初送禮的人                           |
| `gifterAnonymous`                 | `boolean`                    | 同上                               | 當初是匿名贈送                         |
| `anonymous`                       | `boolean`                    | 任何通知                           | 發出事件的人匿名（`author` 為空）      |
| `viewers`                         | `number`                     | 揪團                               | 觀眾人數                               |
| `raider`                          | `string`                     | 揪團                               | 揪團的實況主                           |
| `bitsTier`                        | `number`                     | 小奇點徽章                         | 解鎖的徽章等級                         |
| `charity`、`donation`、`currency` | `string`、`number`、`string` | 慈善捐款                           | 慈善單位、金額（已換算小數）、貨幣代碼 |
| `watchStreak`                     | `number`                     | 觀看連勝                           | 連續觀看的直播場數                     |
| `channelPoints`                   | `number`                     | 觀看連勝                           | 這次里程碑獲得的忠誠點數               |

### 同一批事件（`ChatNotice.meta`）

有些平台把一個動作拆成好幾則通知，例如 Twitch 一次贈送 5 份訂閱：先送 1 則「送出 5 份訂閱給聊天室」，再送 5 則個別贈訂。平台無關的 `meta` 鍵把它們標成同一批：

| 鍵          | 型別      | 說明                                             |
| ----------- | --------- | ------------------------------------------------ |
| `groupId`   | `string`  | 同一批事件共用（`noticeGroup()` 會加上平台前綴） |
| `groupLead` | `boolean` | `true` 標在總事件上                              |
| `recipient` | `string`  | 贈禮的收到者名稱                                 |

所有畫面都把同一批合併成一則（`@chatto/chat-ui` 的 `groupNotice()`）：個別事件到達時總事件已在畫面上，就併進總事件、不另外顯示；個別事件先到時先單獨顯示，總事件到達後把它們收進來。

- 桌面 Overlay、OBS：`reduceFeed()` 的 `FeedItem` 帶 `members`。
- 控制台聊天紀錄：總事件可展開看收到的人；「訂閱與活動」統計只算一次。
- 事件 Overlay：總事件已送出後，同一批的個別事件不再跳卡片、不再播音效（main 的 `route('alerts')`）。

### ChatUser

`id`、`login`（小寫）、`displayName`、`color?`、`avatar?`、`badges: ChatBadge[]`、`roles: UserRole[]`。

`roles` 是跨平台正規化後的身分：`broadcaster`、`moderator`、`vip`、`subscriber`、`founder`、`staff`、`partner`、`artist`、`bot`。主題用它來設定樣式（例如 `[data-roles~="moderator"]`）。

### MessageFragment

訊息內容是有序的片段陣列，**所有片段的 `text` 串起來必須等於原文**。

| type      | 額外欄位                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------------- |
| `text`    | —                                                                                                         |
| `emote`   | `emote: { id, name, source, image, animated?, zeroWidth? }`；`source` 為 `platform`、`7tv`、`bttv`、`ffz` |
| `mention` | `user: { id, login, displayName }`                                                                        |
| `cheer`   | `prefix`、`amount`、`tier?`、`image?`                                                                     |
| `link`    | `url`                                                                                                     |
| `media`   | `mediaType: 'gif' \| 'image'`、`url`                                                                      |

`after-silence` 不是平台提供的：桌面 App 在聊天室安靜一段時間後的第一則留言加上它，而且只送給桌面 Overlay（`overlay` target），OBS 收不到。渲染為 `data-highlight~="after-silence"`，樣式由主題的 `attention` 決定。

`ImageSet` 至少有 `x1`，可另外提供 `x2`、`x4`。

## WebSocket 協定

定義在 `packages/core/src/protocol.ts`，所有 frame 都帶 `v`（目前為 1）。

- client → server：`{ v, type: 'subscribe', target: 'overlay' | 'embed' | 'alerts' }`
- server → client：
  - `hello`：`theme`、`backlog`（最近事件；`alerts` 一律是空的）與 `locale`（聊天室語言，舊版 server 沒有這個欄位）
  - `event`：一個 `ChatEvent`；送給 `alerts` 時另有 `alert: { durationMs, sound? }`（`AlertCue`），告訴事件 Overlay 卡片停留多久、播什麼聲音
  - `theme`：主題變更（內建主題的文字已經換成聊天室語言）
  - `locale`：聊天室語言變更（`zh-TW`、`en`）
- 每個 target 收到的事件可能不同，見 `docs/architecture.md` 的「輸出路由」。
- HTTP `/sounds/<檔名>`：使用者自選的提示音；`/theme-assets/<檔名>`：主題的外框圖片。
- viewer 單獨預覽時可用 `?lang=en` 指定語言（`?mock=1`、`?specimen`）。

## Twitch 對應

| EventSub subscription              | ChatEvent         |
| ---------------------------------- | ----------------- |
| `channel.chat.message`             | `message`         |
| `channel.chat.notification`        | `notice`          |
| `channel.chat.message_delete`      | `message-deleted` |
| `channel.chat.clear_user_messages` | `user-cleared`    |
| `channel.chat.clear`               | `chat-cleared`    |

事件類型：附帶小奇點的訊息 → `cheer`；`message_type: channel_points_highlighted` → `highlighted`；通知的 `notice_type` 轉成 kebab-case 並去掉 `shared_chat_` 前綴，`sub_gift` → `sub-gift`、`community_sub_gift` → `community-gift`（`twitchNoticeEventType()`）。

事件欄位由 `noticeMeta()` 取出。payload 放在和 `notice_type` 同名的鍵下（共享聊天室是 `shared_chat_<type>`）：`sub_tier`（`1000` 等）→ `tier`、`is_prime` → `tier: 'prime'`、`resub.cumulative_months` → `months`、`resub.streak_months` → `streakMonths`、`duration_months` → `durationMonths`、`sub_gift.recipient_user_name` → `recipient`、`cumulative_total` → `totalGifts`、`gifter_user_name`／`gifter_is_anonymous` → `gifter`／`gifterAnonymous`、`raid.user_name`／`viewer_count` → `raider`／`viewers`、`bits_badge_tier.tier` → `bitsTier`、`charity_donation` → `charity`、`donation`、`currency`、`watch_streak.streak_count`／`channel_points_awarded` → `watchStreak`／`channelPoints`。

同一批贈訂：`community_sub_gift.id` → `meta.groupId`＋`meta.groupLead`；`sub_gift.community_gift_id` → `meta.groupId`；`sub_gift.recipient_user_name` → `meta.recipient`。

## 變更紀錄

- **v1.5**（2026-11-04）：`ChatNotice.meta` 新增觀看連勝的 `watchStreak`、`channelPoints`（非破壞性）。

- **v1.4**（2026-11-02）：`ChatNotice.meta` 新增事件欄位（`tier`、`months`、`streakMonths` 等，見上表）；協定的 `hello` 加上 `locale`，新增 `locale` frame；新增 Twitch 事件 `gift-paid-upgrade`、`prime-paid-upgrade`、`pay-it-forward`、`unraid`、`bits-badge-tier`、`charity-donation`（非破壞性）。

- **v1.3**（2026-11-02）：`ChatNotice.meta` 新增 `groupId`、`groupLead`、`recipient`，同一批事件合併顯示（非破壞性）。

- **v1.2**（2026-11-01）：新增 `alerts` target、`event` frame 的選填 `alert`、highlight `after-silence`（非破壞性）。
- **v1.1**（2026-10-31）：新增選填欄位 `eventType`（非破壞性）。
- **v1**（2026-10-31）：初版。
