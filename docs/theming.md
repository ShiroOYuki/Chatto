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

| 欄位        | 說明                                                                                                                                                                   |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base`      | `styled`（參數樣式）或 `blank`（不產生樣式）                                                                                                                           |
| `font`      | `family`、`size`、`lineHeight`、`letterSpacing`（em）、`weight`                                                                                                        |
| `text`      | `color`、`mutedColor`、`accentColor`、`strokeWidth`、`strokeColor`、`shadow`                                                                                           |
| `list`      | 包住所有訊息的面板：`box`、`gap`、`direction`（bottom-up／top-down）、`align`（stretch／start／end）                                                                   |
| `message`   | 單則訊息：`box`、`arrangement`、`gap`、`maxWidth`（0 為不限）、`align`（頭像垂直對齊）                                                                                 |
| `author`    | 名稱：`color`、`useUserColor`、`weight`、`size`（em）、`transform`、`prefix`、`suffix`、`separator`、`box`（時間＋徽章＋名稱的外框）                                   |
| `body`      | 內容：`color`（空字串＝沿用文字色）、`size`、`weight`、`italic`、`box`（例如對話泡泡）                                                                                 |
| `avatar`    | `show`、`size`、`radius`（%）                                                                                                                                          |
| `badges`    | `show`、`size`（em）、`gap`、`radius`                                                                                                                                  |
| `timestamp` | `show`、`hour12`、`color`、`size`（em）                                                                                                                                |
| `emote`     | `size`（em）                                                                                                                                                           |
| `mention`   | 提及與連結：`color`、`background`、`weight`                                                                                                                            |
| `reply`     | `show`、`color`                                                                                                                                                        |
| `notice`    | 訂閱、揪團等通知：`box`、`accentColor`、`accentWidth`（左側色條）、`titleColor`                                                                                        |
| `roles`     | 依身分覆蓋：鍵為 broadcaster／moderator／vip／subscriber／first-message／highlighted，值為 `nameColor`、`nameBackground`、`surfaceBackground`、`borderColor`，皆可省略 |
| `animation` | `enter`（none／fade／slide-up／slide-left／slide-right／pop）、`duration`（ms）                                                                                        |
| `options`   | 顯示規則：`messageLifetime`（秒，0 為永久）、`maxMessages`、`hiddenUsers`、`hiddenPrefixes`                                                                            |
| `customCss` | 自訂 CSS                                                                                                                                                               |

### 排列方式 `message.arrangement`

| 值        | 效果                                   | 使用的預設                   |
| --------- | -------------------------------------- | ---------------------------- |
| `inline`  | 名稱和內容同一行，一起換行             | 抹茶玻璃、和紙、描邊、終端機 |
| `stacked` | 名稱在上、內容在下（內容框可做成泡泡） | 泡泡                         |
| `columns` | 名稱固定在左欄、內容填滿右側           | 暖簾                         |

`surfaceBackground`（身分樣式）會套在「看得見的底色」上：內容框有填色時套在內容框，否則套在訊息框。

## 預設主題對照

| id             | 名稱     | 主要差異（相對於基底）                                               |
| -------------- | -------- | -------------------------------------------------------------------- |
| `matcha-glass` | 抹茶玻璃 | 訊息框：半透明綠底、1px 框線、圓角 12                                |
| `washi`        | 和紙     | 宋體、米白訊息框、圓角 2、固定名稱色、淡入                           |
| `bubble`       | 泡泡     | `stacked`、頭像、名稱縮小、內容框做成泡泡（左下角 4）、彈出          |
| `outline`      | 極簡描邊 | 無底色、字級 18、文字描邊 4px                                        |
| `noren`        | 暖簾     | `columns`、名稱框藍底、內容框半透明藍、從左滑入                      |
| `terminal`     | 終端機   | 等寬字、面板深色底、名稱前綴 `@`、分隔符號為空白、顯示時間、隱藏徽章 |
| `blank`        | Blank    | `base: 'blank'`，只有起始 CSS                                        |

## HTML 結構（公開 API）

```
.chatto-root[data-base][data-arrangement][data-direction][data-theme-id]
  <style>（產生的 CSS ＋ customCss）
  .chatto-list
    .chatto-message[data-platform][data-roles][data-user][data-action][data-highlight]
      .chatto-avatar
      .chatto-content
        .chatto-reply
        .chatto-header
          .chatto-time
          .chatto-badges > .chatto-badge[data-badge]
          .chatto-author
          .chatto-separator
        .chatto-body
          .chatto-emote[data-source][data-zero-width]
          .chatto-mention / .chatto-link / .chatto-cheer[data-tier] / .chatto-media
    .chatto-notice[data-kind][data-platform]
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

/* 整個聊天室加上漸層遮罩，讓舊訊息淡出 */
.chatto-root {
  mask-image: linear-gradient(to bottom, transparent, black 30%);
}
```

## 版本與遷移

- **v2**（2026-10-31）：改為單一基底參數化。v1 的 `layout`、`palette`、`typography`、`shape` 由 `normalizeTheme()` 自動轉成 v2，舊的自訂主題與匯出檔都能直接載入。
- **v1**：初版，六種寫死的版型。
