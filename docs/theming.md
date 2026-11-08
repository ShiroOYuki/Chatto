# 聊天室主題（Schema v2）

型別定義在 `packages/core/src/theme.ts`，基底與預設在 `packages/chat-ui/src/themes.ts`，CSS 產生器在 `packages/chat-ui/src/themeCss.ts`。

## 核心概念：一個基底，全部是參數

所有主題都用**同一個基底渲染器**（同一份 HTML 結構加同一個 CSS 產生器）。主題本身只是一組參數，沒有任何「某個風格專用」的寫死樣式。

- 六個內建主題（抹茶玻璃、和紙、泡泡、極簡描邊、暖簾、終端機）都是 `BASE_THEME` 加上不同參數值，見 `PRESET_THEMES`。
- 編輯器開放每一個參數，所以任何內建主題都能從基底手動調出來；也可以在「基底與結構」用「載入預設參數」把某個預設的值套進來，再自行微調。
- `base: 'blank'` 會**完全關閉產生的樣式**，只留下 HTML 結構與 `customCss`，適合從零寫 CSS。內建的「Blank（自訂 CSS）」主題附有一份最小起始 CSS，可以整份刪掉。

最後輸出的 CSS 順序：產生的樣式 → `customCss`（以 `@scope` 限定在該聊天室，`.chatto-root` 會自動對應到 `:scope`）。

產生的樣式把聊天室根選擇器包在 `:where()` 裡，根本身不增加權重，所以 `customCss` 寫和產生規則相同的選擇器就能覆蓋，例如 `.chatto-body { color: red }` 會蓋過產生的 `.chatto-body`，不必再加 `.chatto-root` 前綴。產生規則之間仍保留各自的權重：身分、事件等較具體的規則（例如 `.chatto-message[data-roles~="moderator"] .chatto-author`）要用同樣具體的選擇器才能覆蓋。

## 參數一覽

單位：長度為 px，標示 em 的欄位以字級為基準。顏色可以是任何 CSS 顏色，`transparent` 代表不填色。

### 共用型別

| 型別         | 內容                                                                                                                 |
| ------------ | -------------------------------------------------------------------------------------------------------------------- |
| `Sides`      | `[上, 右, 下, 左]`                                                                                                   |
| `Corners`    | `[左上, 右上, 右下, 左下]`                                                                                           |
| `BorderSpec` | `width`、`style`（solid／dashed／dotted／double／none）、`color`                                                     |
| `ShadowSpec` | `x`、`y`、`blur`、`spread`、`color`、`inset?`（文字陰影忽略 spread、inset）                                          |
| `BoxStyle`   | `background`、`border`、`radius`、`padding`、`shadow`、`backdropBlur`、`image`（九宮格圖片外框，`null` 為不使用）    |
| `BoxImage`   | `src`、`slice`（`Sides`，圖片像素）、`fill`、`scale`、`repeat`（stretch／repeat／round／space）、`outset`（`Sides`） |

### 主題欄位

| 欄位        | 說明                                                                                                                                                                                                                                                                                                                          |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base`      | `styled`（參數樣式）或 `blank`（不產生樣式）                                                                                                                                                                                                                                                                                  |
| `font`      | `family`、`size`、`lineHeight`、`letterSpacing`（em）、`weight`                                                                                                                                                                                                                                                               |
| `text`      | `color`、`mutedColor`、`accentColor`、`strokeWidth`、`strokeColor`、`shadow`                                                                                                                                                                                                                                                  |
| `list`      | 包住所有訊息的面板：`box`、`gap`、`direction`（bottom-up／top-down）、`align`（stretch／start／end）                                                                                                                                                                                                                          |
| `message`   | 單則訊息：`box`、`arrangement`、`gap`、`maxWidth`（0 為不限）、`align`（頭像垂直對齊）                                                                                                                                                                                                                                        |
| `author`    | 名稱：`color`、`useUserColor`、`weight`、`size`（em）、`transform`、`prefix`、`suffix`、`separator`、`box`（時間＋徽章＋名稱的外框）                                                                                                                                                                                          |
| `body`      | 內容：`color`（空字串＝沿用文字色）、`size`、`weight`、`italic`、`box`（例如對話泡泡）                                                                                                                                                                                                                                        |
| `avatar`    | `show`、`size`、`radius`（%）                                                                                                                                                                                                                                                                                                 |
| `badges`    | `show`、`size`（em）、`gap`、`radius`                                                                                                                                                                                                                                                                                         |
| `timestamp` | `show`、`hour12`、`color`、`size`（em）                                                                                                                                                                                                                                                                                       |
| `emote`     | `size`（em）                                                                                                                                                                                                                                                                                                                  |
| `mention`   | 提及與連結：`color`、`background`、`weight`                                                                                                                                                                                                                                                                                   |
| `reply`     | `show`、`color`                                                                                                                                                                                                                                                                                                               |
| `notice`    | **通用事件訊息**（所有平台事件共用）：`box`、`accentColor`、`accentWidth`（左側色條）、`titleColor`、`bodyColor`（空字串＝沿用）、`icon`（標題前文字）、`messageFrame`（聊天訊息事件的外框位置）、`titlePlacement`（聊天訊息事件的標題位置）、`sticker`（標題貼紙的 `background`、`color`、`rotate`）                         |
| `events`    | 各平台事件的樣式，鍵為 `平台:事件`（例如 `twitch:cheer`），值為 `{ linked, style }`；見下方「平台事件」                                                                                                                                                                                                                       |
| `eventText` | 自訂事件文字模板，鍵為 `平台:事件`；空的用內建文字。見下方「事件文字」                                                                                                                                                                                                                                                        |
| `roles`     | 依身分覆蓋：鍵為 viewer（一般觀眾：沒有 broadcaster、moderator、vip、subscriber、founder 身分）／broadcaster／moderator／vip／subscriber／first-message，值為 `nameColor`、`nameBackground`、`surfaceBackground`、`borderColor`、`frame`（`BoxImage`，套在訊息看得見的底色上），皆可省略                                      |
| `animation` | `enter`（none／fade／slide-up／slide-left／slide-right／pop／bounce／shake／zoom）、`duration`（ms）、`exit`（none／fade／slide-up／slide-left／slide-right／pop／zoom，事件 Overlay 的卡片離場時使用）                                                                                                                       |
| `attention` | 沉寂後新留言（`data-highlight~="after-silence"`，只在桌面 Overlay）：`effect`（none／glow／pulse／shake）、`color`、`repeat`（次數）、`label`（右上角標籤，空字串＝不顯示）、`labels`（選填，各語言的標籤文字，例如 `{ "zh-TW": "新留言", "en": "New" }`；依聊天室語言以 `:lang()` 切換，沒有的語言用 `label`）、`labelColor` |
| `options`   | 顯示規則：`messageLifetime`（秒，0 為永久）、`maxMessages`、`hiddenUsers`、`hiddenPrefixes`                                                                                                                                                                                                                                   |
| `customCss` | 自訂 CSS                                                                                                                                                                                                                                                                                                                      |

### 排列方式 `message.arrangement`

| 值        | 效果                                   | 使用的預設                   |
| --------- | -------------------------------------- | ---------------------------- |
| `inline`  | 名稱和內容同一行，一起換行             | 抹茶玻璃、和紙、描邊、終端機 |
| `stacked` | 名稱在上、內容在下（內容框可做成泡泡） | 泡泡                         |
| `columns` | 名稱固定在左欄、內容填滿右側           | 暖簾                         |

`surfaceBackground`（身分樣式）會套在「看得見的底色」上：內容框有填色時套在內容框，否則套在訊息框。

## 平台事件

平台專屬事件（Twitch 的小奇點、訂閱、揪團…）一律以 `平台:事件` 識別，例如 `twitch:cheer`、`twitch:community-gift`。清單、名稱（繁中、英文、日文）與內建文字模板集中在 `packages/chat-ui/src/events.ts` 的 `EVENT_CATALOG`，編輯器的「Twitch 專屬元件」選單就是從這裡產生；新增平台時加一個群組即可，其他層不用改。

事件分兩類：

- **通知**（`.chatto-notice`）：訂閱、續訂、贈訂、大量贈訂、贈訂轉付費、Prime 轉付費、贈訂傳下去、揪團、取消揪團、公告、小奇點徽章、慈善捐款、觀看連勝。
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

## 事件文字

事件的文字（通知的整行文字、事件訊息的標題）由模板產生，語言是**聊天室語言**（設定頁「語言」，預設跟隨介面語言；控制台的預覽也用它）。每個事件在 `EVENT_CATALOG` 有內建模板（`text`，繁中、英文、日文）與可用變數（`variables`）。

- `theme.eventText[事件鍵]`：主題自己的模板，例如 `{ "twitch:resub": "感謝 {user} 的 {months} 個月訂閱" }`。留空或沒有這個鍵就用內建模板；自訂模板組不出來時也退回內建模板，再不行就顯示平台原文。編輯器在每個平台事件的區塊有「文字」欄位。
- 模板語法（內建與自訂共用，`renderTemplate()`）：
  - `{name}` 代入變數，數字依語言格式化（`12,345`）。
  - `{name|單數|複數}` 依變數的數字選字，不輸出數字本身，例如 `{months} {months|month|months}`。
  - `[ … ]` 裡的變數都有值才顯示，例如 `[，連續 {streak} 個月]`。
  - 方括號外的變數沒有值時，整個模板視為失敗。
- 可用變數：`user`（發出事件的人；匿名時為「匿名觀眾」）、`tier`（`Tier 1`、`Prime`）、`months`、`streak`、`duration`、`recipient`、`gifter`、`count`、`totalGifts`、`viewers`、`raider`、`bitsTier`、`charity`、`donation`（含貨幣）、`watchStreak`（連續觀看場數）、`channelPoints`（觀看連勝獲得的忠誠點數）；事件訊息另有 `amount`（小奇點數量）。各事件能用哪些見 `EVENT_CATALOG` 的 `variables`，資料來源見 `docs/message-format.md`「事件欄位」。
- 內建主題的名稱與預設文字（`attention.label`「新留言」）跟著語言（`localizeTheme()`）；自訂主題裡的文字照寫的顯示，標籤可以用 `attention.labels` 為每種語言各寫一份。複製內建主題時，名稱與 `label` 取當下語言，`labels` 則帶上兩種語言的預設標籤。

## 沉寂後新留言與事件 Overlay

- `attention` 的效果和標籤套在訊息「看得見的底色」上（內容框有填色時是 `.chatto-body`，否則是 `.chatto-message`）。顏色以 CSS 變數 `--chatto-attention` 傳給 keyframes，自訂 CSS 也能改。效果在訊息列本身時，會和進場動畫一起播放，不會蓋掉它。
- `columns` 排列加標籤時，和事件貼紙一樣改成不裁切，由名稱框與內容框各自補外側圓角。
- 事件 Overlay（`/alerts`）用同一個 `ChatView`，一次只放一張卡片；時間到時在 `.chatto-root` 加上 `data-leaving`，播放 `animation.exit`，結束後才換下一張。`exitDurationMs(theme)` 回傳要等多久。

## 效能：高成本參數

在 OBS embed 頁、每秒 25 則訊息的量測（2026-11-08，#57，Chromium 主執行緒 CPU）：

| 主題                            | CPU        |
| ------------------------------- | ---------- |
| 抹茶玻璃（無進場動畫）          | 約 18%     |
| 泡泡（`pop` 進場）              | 約 22%     |
| 泡泡，關掉進場動畫              | 約 11%     |
| 泡泡，改成 `fade` 或 `slide-up` | 約 20～23% |

- **進場動畫（`animation.enter`）是最主要的成本**，不分種類；高流量時大約讓 CPU 加倍。`will-change`、`contain` 沒有改善。聊天室很熱鬧時，`enter: 'none'` 最省。
- 頭像、`stacked` 排列、事件貼紙的影響很小（各差不到 5%）。
- `backdropBlur`（`backdrop-filter`）、陰影與 `zoom` 進場的 `filter: blur()` 會增加繪製成本，盡量只用在少數元素。

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
| `tea-leaf`     | 茶葉框   | 訊息與事件用九宮格圖片外框（內嵌的茶葉框圖，切線上下 40／左右 48、縮放 0.5）、粉色強調、彈出    |
| `terminal`     | 終端機   | 等寬字、面板深色底、名稱前綴 `@`、分隔符號為空白、顯示時間、隱藏徽章                            |
| `blank`        | Blank    | `base: 'blank'`，只有起始 CSS                                                                   |

另有 `PLAIN_PRESET`（`plain`，空白（從零開始））：仍走參數樣式，但所有視覺參數歸零（無底色、框線、圓角、內距、間距、陰影、色條、動畫），只剩可讀的純文字，方便從零逐項調整。它不列在主題卡片，只出現在編輯器的「載入預設參數」。載入任何預設參數時只替換樣式參數，`options`（顯示規則）與 `customCss` 保留。

## HTML 結構（公開 API）

```
.chatto-root[lang][data-base][data-arrangement][data-direction][data-theme-id]
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

`lang` 是聊天室語言（`zh-TW`、`en` 或 `ja`，和事件文字同一個設定），2026-11-06 加入。自訂 CSS 自己寫的文字（`content`）可以用 `:lang()` 依語言切換；舊版 Chatto 沒有這個屬性，所以把英文寫成預設、中文寫在 `:lang(zh)` 裡，舊版就會顯示英文。

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

/* 自己加的文字跟著聊天室語言：英文寫成預設，中文用 :lang(zh) 覆蓋 */
.chatto-notice .chatto-body::after {
  content: ' Thank you!';
}
.chatto-notice .chatto-body:lang(zh)::after {
  content: ' 感謝！';
}

/* 整個聊天室加上漸層遮罩，讓舊訊息淡出 */
.chatto-root {
  mask-image: linear-gradient(to bottom, transparent, black 30%);
}
```

## 在 VSCode 編輯自訂 CSS

主題編輯器的「自訂 CSS」區塊有「在 VSCode 開啟」按鈕（main：`css-files.ts` 的 `CssFiles`；renderer：`useExternalCss`）：

- 檔案在 userData 的 `custom-css/<主題 id>.css`，路徑固定，主題改名不影響；刪除主題時一起刪除。
- **檔案永遠等於已儲存的主題**：
  - 在外部編輯器存檔：Chatto 直接儲存主題，Overlay／OBS 立即更新（`AppController.applyExternalCss`）。資料夾在 Chatto 執行期間都在監看，不需要開著主題編輯器。
  - 主題編輯器開著時，存檔的 CSS 同時進入草稿和已儲存版本（`acceptSavedCss`），其他未儲存的修改保留。
  - 在 Chatto 按「儲存」時，把 CSS 寫回檔案（只寫已經開過的主題）。
  - Chatto 裡還有未儲存的 CSS 修改時，按鈕停用，要先儲存。兩邊都改時以最後存檔為準。
- 開啟時同時寫入工作區檔案：`.vscode/settings.json`（`css.customData` 指向 `.vscode/chatto.css-data.json`，描述 `VARIABLE_REFERENCE` 的 CSS 變數）與 `chatto-reference.css`（`reference.ts` 的所有選擇器與說明，只供參考，改了不會套用）。VSCode 內建的 CSS 支援不提供 class 名稱自動完成，所以選擇器用參考檔查閱。
- 編輯器指令在設定頁「自訂 CSS → 外部編輯器」（`prefs.editorCommand`）。留空等於 `code "{folder}" "{file}"`；沒寫 `{file}` 時會把檔案路徑加在最後。指令失敗（非 0 結束碼）時改用系統關聯 `.css` 的程式開啟；也失敗時顯示檔案路徑。

## 九宮格圖片外框

每個 `BoxStyle` 都能用 `image` 加一張九宮格外框（CSS `border-image`）：四角固定，四邊依 `repeat` 拉伸或重複，`fill` 開啟時中間那格當背景。身分樣式的 `roles.<身分>.frame` 也是同一種設定。

- **切線** `slice` 以圖片像素計算 `[上, 右, 下, 左]`。外框畫在一圈透明框線裡，寬度是 `slice × scale`，所以內容會像有真的框線一樣往內縮；`outset` 讓外框超出方框。
- **高解析度圖片**：用兩倍大的圖並把 `scale` 設成 0.5，在高 DPI 螢幕與 OBS 縮放時比較銳利。
- **和其他參數的關係**：有圖片時 `border` 不作用；`border-image` 不吃圓角，`radius` 只影響背景與模糊，建議背景用 `transparent`、交給 `fill`；`shadow` 改成 `filter: drop-shadow()`，會沿著圖片（連文字一起）投影；`backdropBlur` 仍是矩形範圍。內距建議不小於外框寬度。
- **素材**：在編輯器選圖時，圖片複製到 userData `theme-assets/<sha256>.<副檔名>`，主題裡存 `asset:<檔名>`，本機 server 在 `/theme-assets/<檔名>` 提供（Viewer 自己的建置檔在 `/assets/`）。同一張圖只存一份；啟動時刪除沒有任何已儲存主題使用的圖。只接受 PNG（含 APNG）、WebP、GIF，單檔 2 MB 以內，依檔案內容判斷格式；不接受 SVG。`src` 也可以是 `data:image/(png|webp|gif);base64,…`，內建主題用這種方式內嵌圖片。其他來源在 `normalizeTheme()` 時會被移除。
- **編輯器**：切線編輯器顯示原圖與四條虛線，可拖曳，或聚焦後用方向鍵（Shift 一次 10 px）；選新圖時先切成三等分。
- **在自訂 CSS 覆寫**：產生的 CSS 用 `border-image-source`、`border-image-slice`、`border-image-width`、`border-image-outset`、`border-image-repeat`，自訂 CSS 可以直接覆寫這些屬性。

### 主題包 `.chattotheme`

主題一律匯出成主題包（#32）：一個 zip，內含 `theme.json` 與用到的 `assets/<sha256>.<副檔名>`（沒有圖片時只有 `theme.json`）。預設檔名是主題名稱（去掉 Windows 不允許的字元，`packageFileName()`）。想看或手改 JSON 時解壓縮即可。匯入接受主題包，也接受舊版匯出的 `.json`：

- 主題包的圖片依內容重新計算雜湊後存入，名稱對不上或不是支援的圖片時，用到它的外框會被移除。
- 單一 JSON 檔帶不了圖片，匯入時 `asset:` 外框會被移除，`data:` 外框保留。
- 在主題頁匯入的主題一律存成新的自訂主題（新的 id，名稱加「（匯入）」）。
- 探索頁：主題詳情的「下載檔案」把分享的主題（連同圖片）存成主題包，不安裝、不帶 `origin`，和安裝一樣算一次下載（`ShareClient.download`）。投稿對話框的「從檔案選擇」把選的檔案存成本機主題（保留原名稱）並選它，之後照一般流程投稿；發佈後這個本機主題就連到分享主題。服務端不變，仍是主題 JSON 與圖片分開上傳。

## 來自分享平台的主題 `origin`

從「探索」安裝的主題帶有 `origin: { shareId, version, contentHash }`：分享平台上的 id、安裝的版本，以及安裝當下的內容雜湊（`themeContentHash`，不含 `id`、`builtIn`、`origin`）。內容和雜湊不同就表示使用者改過，之後不再提示更新；沒改過且平台上有更新的版本時，主題頁與探索頁會提示「有新版」。自己投稿的主題也會記下對應的 `origin`，以便之後發佈新版本。`normalizeTheme` 只保留欄位完整的 `origin`。這是選填欄位，不影響 schema 版本。

## 版本與遷移

- **v2 新增欄位**（2026-11-06，非破壞性）：`attention.labels`（選填，各語言的標籤文字）。沒有內容時整個欄位不存在，所以舊主題的內容雜湊不變；`normalizeTheme()` 只保留已知語言的非空字串。舊版 App 會忽略這個欄位，只顯示 `label`。
- **v2 新增欄位**（2026-11-02，非破壞性）：`eventText`（自訂事件文字，預設 `{}`，`normalizeTheme()` 只保留非空字串）。
- **v2 新增欄位**（2026-11-02，非破壞性）：`BoxStyle.image`（九宮格圖片外框，預設 `null`）、`roles.<身分>.frame`；新增主題包 `.chattotheme`。`normalizeTheme()` 會補齊預設並移除無效的圖片來源。
- **v2 新增欄位**（2026-11-01，非破壞性）：`animation.exit`、`attention`；`animation.enter` 新增 bounce、shake、zoom。`normalizeTheme()` 會補齊預設。
- **v2 新增欄位**（2026-11-01，非破壞性）：`notice.messageFrame`、`notice.titlePlacement`、`notice.sticker` 與各事件的同名欄位（預設 `wrap`、`line`，`normalizeTheme()` 會補齊）；`roles.viewer`（一般觀眾）。
- **v2 新增欄位**（2026-10-31，非破壞性）：`notice.bodyColor`、`notice.icon`、`events`；`roles.highlighted` 移除，改由 `twitch:highlighted` 事件處理（`normalizeTheme()` 會補齊預設並移除舊鍵）。
- **v2**（2026-10-31）：改為單一基底參數化。v1 的 `layout`、`palette`、`typography`、`shape` 由 `normalizeTheme()` 自動轉成 v2，舊的自訂主題與匯出檔都能直接載入。
- **v1**：初版，六種寫死的版型。
