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
  highlights: ('first-message' | 'highlighted' | ...)[];
  reply?: { parentMessageId, parentAuthor, parentText };
  cheerAmount?: number;
}
```

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

`ImageSet` 至少有 `x1`，可另外提供 `x2`、`x4`。

## WebSocket 協定

定義在 `packages/core/src/protocol.ts`，所有 frame 都帶 `v`（目前為 1）。

- client → server：`{ v, type: 'subscribe', target: 'overlay' | 'embed' }`
- server → client：
  - `hello`：`theme` 與 `backlog`（最近事件）
  - `event`：一個 `ChatEvent`
  - `theme`：主題變更

## Twitch 對應

| EventSub subscription              | ChatEvent         |
| ---------------------------------- | ----------------- |
| `channel.chat.message`             | `message`         |
| `channel.chat.notification`        | `notice`          |
| `channel.chat.message_delete`      | `message-deleted` |
| `channel.chat.clear_user_messages` | `user-cleared`    |
| `channel.chat.clear`               | `chat-cleared`    |

## 變更紀錄

- **v1**（2026-10-31）：初版。
