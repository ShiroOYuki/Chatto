# 聊天室主題（Schema v2）

型別定義在 `packages/core/src/theme.ts`，基底與預設在 `packages/chat-ui/src/themes.ts`，CSS 產生器在 `packages/chat-ui/src/themeCss.ts`。

## 核心概念：一個基底，全部是參數

所有主題都用**同一個基底渲染器**（同一份 HTML 結構加同一個 CSS 產生器）。主題本身只是一組參數，沒有任何「某個風格專用」的寫死樣式。

- 六個內建主題（抹茶玻璃、和紙、泡泡、極簡描邊、暖簾、終端機）都是 `BASE_THEME` 加上不同參數值，見 `PRESET_THEMES`。
- 編輯器開放每一個參數，所以任何內建主題都能從基底手動調出來；也可以在「基底與結構」用「載入預設參數」把某個預設的值套進來，再自行微調。
- `base: 'blank'` 會**完全關閉產生的樣式**，只留下 HTML 結構與 `customCss`，適合從零寫 CSS。內建的「Blank（自訂 CSS）」主題附有一份最小起始 CSS，可以整份刪掉。

最後輸出的 CSS 順序：產生的樣式 → `customCss`（以 `@scope` 限定在該聊天室，`.chatto-root` 會自動對應到 `:scope`）。

## 參數一覽

單位：長度為 px，標示 em 的欄位以字級為基準。顏色可以是任何 CSS 顏色，`transparent` 代表不填色。

### 共用型別

| 型別         | 內容                                                                        |
| ------------ | --------------------------------------------------------------------------- |
| `Sides`      | `[上, 右, 下, 左]`                                                          |
| `Corners`    | `[左上, 右上, 右下, 左下]`                                                  |
| `BorderSpec` | `width`、`style`（solid／dashed／dotted／double／none）、`color`            |
| `ShadowSpec` | `x`、`y`、`blur`、`spread`、`color`、`inset?`（文字陰影忽略 spread、inset） |
| `BoxStyle`   | `background`、`border`、`radius`、`padding`、`shadow`、`backdropBlur`       |

### 主題欄位

| 欄位        | 說明                                                                                                                                                                                                                                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base`      | `styled`（參數樣式）或 `blank`（不產生樣式）                                                                                                                                                                                                                                                          |
| `font`      | `family`、`size`、`lineHeight`、`letterSpacing`（em）、`weight`                                                                                                                                                                                                                                       |
| `text`      | `color`、`mutedColor`、`accentColor`、`strokeWidth`、`strokeColor`、`shadow`                                                                                                                                                                                                                          |
| `list`      | 包住所有訊息的面板：`box`、`gap`、`direction`（bottom-up／top-down）、`align`（stretch／start／end）                                                                                                                                                                                                  |
| `message`   | 單則訊息：`box`、`arrangement`、`gap`、`maxWidth`（0 為不限）、`align`（頭像垂直對齊）                                                                                                                                                                                                                |
| `author`    | 名稱：`color`、`useUserColor`、`weight`、`size`（em）、`transform`、`prefix`、`suffix`、`separator`、`box`（時間＋徽章＋名稱的外框）                                                                                                                                                                  |
| `body`      | 內容：`color`（空字串＝沿用文字色）、`size`、`weight`、`italic`、`box`（例如對話泡泡）                                                                                                                                                                                                                |
| `avatar`    | `show`、`size`、`radius`（%）                                                                                                                                                                                                                                                                         |
| `badges`    | `show`、`size`（em）、`gap`、`radius`                                                                                                                                                                                                                                                                 |
| `timestamp` | `show`、`hour12`、`color`、`size`（em）                                                                                                                                                                                                                                                               |
| `emote`     | `size`（em）                                                                                                                                                                                                                                                                                          |
| `mention`   | 提及與連結：`color`、`background`、`weight`                                                                                                                                                                                                                                                           |
| `reply`     | `show`、`color`                                                                                                                                                                                                                                                                                       |
| `notice`    | **通用事件訊息**（所有平台事件共用）：`box`、`accentColor`、`accentWidth`（左側色條）、`titleColor`、`bodyColor`（空字串＝沿用）、`icon`（標題前文字）、`messageFrame`（聊天訊息事件的外框位置）、`titlePlacement`（聊天訊息事件的標題位置）、`sticker`（標題貼紙的 `background`、`color`、`rotate`） |
| `events`    | 各平台事件的樣式，鍵為 `平台:事件`（例如 `twitch:cheer`），值為 `{ linked, style }`；見下方「平台事件」                                                                                                                                                                                               |
| `roles`     | 依身分覆蓋：鍵為 viewer（一般觀眾：沒有 broadcaster、moderator、vip、subscriber、founder 身分）／broadcaster／moderator／vip／subscriber／first-message，值為 `nameColor`、`nameBackground`、`surfaceBackground`、`borderColor`，皆可省略                                                             |
| `animation` | `enter`（none／fade／slide-up／slide-left／slide-right／pop／bounce／shake／zoom）、`duration`（ms）、`exit`（none／fade／slide-up／slide-left／slide-right／pop／zoom，事件 Overlay 的卡片離場時使用）                                                                                               |
| `attention` | 沉寂後新留言（`data-highlight~="after-silence"`，只在桌面 Overlay）：`effect`（none／glow／pulse／shake）、`color`、`repeat`（次數）、`label`（右上角標籤，空字串＝不顯示）、`labelColor`                                                                                                             |
| `options`   | 顯示規則：`messageLifetime`（秒，0 為永久）、`maxMessages`、`hiddenUsers`、`hiddenPrefixes`                                                                                                                                                                                                           |
| `customCss` | 自訂 CSS                                                                                                                                                                                                                                                                                              |

### 排列方式 `message.arrangement`

| 值        | 效果                                   | 使用的預設                   |
| --------- | -------------------------------------- | ---------------------------- |
| `inline`  | 名稱和內容同一行，一起換行             | 抹茶玻璃、和紙、描邊、終端機 |
| `stacked` | 名稱在上、內容在下（內容框可做成泡泡） | 泡泡                         |
| `columns` | 名稱固定在左欄、內容填滿右側           | 暖簾                         |

`surfaceBackground`（身分樣式）會套在「看得見的底色」上：內容框有填色時套在內容框，否則套在訊息框。

## 平台事件

平台專屬事件（Twitch 的小奇點、訂閱、揪團…）一律以 `平台:事件` 識別，例如 `twitch:cheer`、`twitch:community-gift`。清單與中文名稱集中在 `packages/chat-ui/src/events.ts` 的 `EVENT_CATALOG`，編輯器的「Twitch 專屬元件」選單就是從這裡產生；新增平台時加一個群組即可，其他層不用改。

事件分兩類：

- **通知**（`.chatto-notice`）：訂閱、續訂、贈訂、大量贈訂、揪團、公告、觀看連勝。
- **事件訊息**（`.chatto-message[data-event]`）：小奇點、頻道點數強調訊息。保留一般訊息的結構，另外在內容區最上方加上 `.chatto-event-title`。

樣式規則：

- 所有事件預設使用 `notice`（通用事件訊息）。
- `events[key].linked === true` 或沒有該鍵：持續跟隨通用事件訊息，通用樣式改了它也跟著改。
- 在編輯器裡修改某個事件時，會先複製目前的通用樣式再套用修改，並設成 `linked: false`（獨立樣式）。按「與通用事件訊息同步」會設回 `linked: true`。
- `resolveEventStyle(theme, key)` 回傳實際使用的樣式；`linkEvent`、`editEventStyle` 是編輯器用的不可變更新函式。
- `messageFrame` 決定事件外框在**事件訊息**上的位置（通知不受影響，一律使用完整的 `box`）：
  - `wrap`（預設）：事件外框包住整則訊息。
  - `surface`：只把事件的填色、框線、陰影、模糊、左側色條套到訊息「看得見的底色」上（內容框有填色時套在 `.chatto-body`，否則套在訊息框），保留原本的圓角與內距，避免泡泡、暖簾這類主題出現框中框。泡泡、暖簾預設使用 `surface`。
  - 獨立樣式的事件選了和通用樣式不同的模式時，產生的 CSS 會把另一邊還原成基底的訊息框／內容框。
- `titlePlacement` 決定**事件訊息**標題（`.chatto-event-title`）的位置（通知的標題固定在第一行）：
  - `line`（預設）：內容區最上方獨立一行，顏色用 `titleColor`。
  - `sticker`：傾斜的小膠囊貼在訊息看得見的底色右上角，顏色、底色、角度由 `sticker` 決定。`stacked` 且內容框有填色時，標題和 `.chatto-body` 放在 `.chatto-content` 的同一個 grid 格子裡；其他排列用 `position: absolute` 貼在 `.chatto-message` 上（`columns` 會裁切溢出，所以貼在框內）。泡泡預設使用 `sticker`。
- 產生的 CSS 先輸出通用規則，再為每個獨立樣式的事件輸出 `[data-event="key"]` 規則；事件規則排在身分樣式之後，所以事件外觀優先於作者身分。

## 沉寂後新留言與事件 Overlay

- `attention` 的效果和標籤套在訊息「看得見的底色」上（內容框有填色時是 `.chatto-body`，否則是 `.chatto-message`）。顏色以 CSS 變數 `--chatto-attention` 傳給 keyframes，自訂 CSS 也能改。效果在訊息列本身時，會和進場動畫一起播放，不會蓋掉它。
- `columns` 排列加標籤時，和事件貼紙一樣改成不裁切，由名稱框與內容框各自補外側圓角。
- 事件 Overlay（`/alerts`）用同一個 `ChatView`，一次只放一張卡片；時間到時在 `.chatto-root` 加上 `data-leaving`，播放 `animation.exit`，結束後才換下一張。`exitDurationMs(theme)` 回傳要等多久。

## 名稱顏色

平台上的名稱顏色以 CSS 變數 `--chatto-user-color` 放在 `.chatto-author` 上（不是 inline `color`），所以自訂 CSS 不需要 `!important` 就能覆蓋。`author.useUserColor` 開啟時產生 `color: var(--chatto-user-color, <author.color>)`；Blank 主題可自行使用這個變數。

## 預設主題對照

| id             | 名稱     | 主要差異（相對於基底）                                                                          |
| -------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `matcha-glass` | 抹茶玻璃 | 訊息框：半透明綠底、1px 框線、圓角 12                                                           |
| `washi`        | 和紙     | 宋體、米白訊息框、圓角 2、固定名稱色、淡入                                                      |
| `bubble`       | 泡泡     | `stacked`、頭像、名稱縮小、內容框做成泡泡（左下角 4）、事件加珊瑚色框線、標題做成角落貼紙、彈出 |
| `outline`      | 極簡描邊 | 無底色、字級 18、文字描邊 4px                                                                   |
| `noren`        | 暖簾     | `columns`、名稱框藍底、內容框半透明藍、從左滑入                                                 |
| `terminal`     | 終端機   | 等寬字、面板深色底、名稱前綴 `@`、分隔符號為空白、顯示時間、隱藏徽章                            |
| `blank`        | Blank    | `base: 'blank'`，只有起始 CSS                                                                   |

另有 `PLAIN_PRESET`（`plain`，空白（從零開始））：仍走參數樣式，但所有視覺參數歸零（無底色、框線、圓角、內距、間距、陰影、色條、動畫），只剩可讀的純文字，方便從零逐項調整。它不列在主題卡片，只出現在編輯器的「載入預設參數」。載入任何預設參數時只替換樣式參數，`options`（顯示規則）與 `customCss` 保留。

## HTML 結構（公開 API）

```
.chatto-root[data-base][data-arrangement][data-direction][data-theme-id]
  <style>（產生的 CSS ＋ customCss）
  .chatto-list
    .chatto-message[data-platform][data-roles][data-user][data-action][data-highlight][data-event]
      .chatto-avatar
      .chatto-content
        .chatto-event-title（只有事件訊息）
        .chatto-reply
        .chatto-header
          .chatto-time
          .chatto-badges > .chatto-badge[data-badge]
          .chatto-author（style 帶 --chatto-user-color）
          .chatto-separator
        .chatto-body
          .chatto-emote[data-source][data-zero-width]
          .chatto-mention / .chatto-link / .chatto-cheer[data-tier] / .chatto-media
    .chatto-notice[data-kind][data-platform][data-event]
      .chatto-notice-system
      .chatto-body
```

改名或移除以上任一項都屬於破壞性變更，需要遞增 `THEME_SCHEMA_VERSION`。頭像、時間、徽章只有在對應的 `show` 開啟時才會輸出（Blank 也一樣）。

## 自訂 CSS 範例

```css
/* 管理員名稱前加上盾牌 */
.chatto-message[data-roles~='moderator'] .chatto-author::before {
  content: '🛡 ';
}

/* 只放大實況主的訊息 */
.chatto-message[data-roles~='broadcaster'] .chatto-body {
  font-size: 1.2em;
}

/* 只改大量贈訂的外框 */
.chatto-notice[data-event='twitch:community-gift'] {
  border: 2px dashed gold;
}

/* 整個聊天室加上漸層遮罩，讓舊訊息淡出 */
.chatto-root {
  mask-image: linear-gradient(to bottom, transparent, black 30%);
}
```

## 版本與遷移

- **v2 新增欄位**（2026-11-01，非破壞性）：`animation.exit`、`attention`；`animation.enter` 新增 bounce、shake、zoom。`normalizeTheme()` 會補齊預設。
- **v2 新增欄位**（2026-11-01，非破壞性）：`notice.messageFrame`、`notice.titlePlacement`、`notice.sticker` 與各事件的同名欄位（預設 `wrap`、`line`，`normalizeTheme()` 會補齊）；`roles.viewer`（一般觀眾）。
- **v2 新增欄位**（2026-10-31，非破壞性）：`notice.bodyColor`、`notice.icon`、`events`；`roles.highlighted` 移除，改由 `twitch:highlighted` 事件處理（`normalizeTheme()` 會補齊預設並移除舊鍵）。
- **v2**（2026-10-31）：改為單一基底參數化。v1 的 `layout`、`palette`、`typography`、`shape` 由 `normalizeTheme()` 自動轉成 v2，舊的自訂主題與匯出檔都能直接載入。
- **v1**：初版，六種寫死的版型。
