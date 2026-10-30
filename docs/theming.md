# 聊天室主題

主題定義在 `packages/core/src/theme.ts`，預設主題在 `packages/chat-ui/src/themes.ts`。主題是純 JSON，可以匯出分享。

## 結構

主題分成兩個獨立的軸，可以自由組合：

| 欄位         | 意義                                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| `layout`     | **風格**：訊息的結構與造型。`card`、`bubble`、`inline`、`tag`、`terminal`                            |
| `palette`    | **配色**：`surface`、`border`、`text`、`mutedText`、`accent`、`nameSurface`、`name`、`textStroke`    |
| `typography` | 字型、字級、名稱字重、文字描邊寬度                                                                   |
| `shape`      | 圓角、框線寬度、內距、訊息間距                                                                       |
| `options`    | 顯示徽章／頭像／時間、使用者名稱顏色、方向、訊息存活秒數、最大則數、進場動畫、隱藏的使用者與指令前綴 |
| `customCss`  | 自訂 CSS，會附加在產生的樣式之後                                                                     |

## 預設主題

| id             | 名稱     | layout   |
| -------------- | -------- | -------- |
| `matcha-glass` | 抹茶玻璃 | card     |
| `washi`        | 和紙     | card     |
| `bubble`       | 泡泡     | bubble   |
| `outline`      | 極簡描邊 | inline   |
| `noren`        | 暖簾     | tag      |
| `terminal`     | 終端機   | terminal |

## CSS 變數

套用在 `.chatto-root` 上：

`--chatto-surface`、`--chatto-border`、`--chatto-text`、`--chatto-muted`、`--chatto-accent`、`--chatto-name-surface`、`--chatto-name`、`--chatto-stroke`、`--chatto-font`、`--chatto-font-size`、`--chatto-name-weight`、`--chatto-stroke-width`、`--chatto-radius`、`--chatto-border-width`、`--chatto-pad-y`、`--chatto-pad-x`、`--chatto-gap`

## 穩定的 class 與屬性（公開 API）

```
.chatto-root[data-layout][data-direction][data-animation]
  .chatto-list
    .chatto-message[data-platform][data-roles][data-user][data-action][data-highlight]
      .chatto-avatar
      .chatto-content
        .chatto-header
          .chatto-time
          .chatto-badges > .chatto-badge[data-badge]
          .chatto-author
          .chatto-separator
        .chatto-reply
        .chatto-body
          .chatto-emote[data-source][data-zero-width]
          .chatto-mention / .chatto-link / .chatto-cheer[data-tier] / .chatto-media
    .chatto-notice[data-kind][data-platform]
      .chatto-notice-system
      .chatto-body
```

改名或移除以上任一項都屬於破壞性變更，需要遞增 `THEME_SCHEMA_VERSION`。

## 自訂 CSS 範例

```css
/* 管理員名稱加上小盾牌 */
.chatto-message[data-roles~='moderator'] .chatto-author::before {
  content: '🛡 ';
}

/* 實況主的訊息改成櫻花色底 */
.chatto-message[data-roles~='broadcaster'] {
  --chatto-surface: rgba(244, 192, 209, 0.85);
  --chatto-text: #4b1528;
}

/* 首次發言的訊息加上光暈邊框 */
.chatto-message[data-highlight~='first-message'] {
  outline: 2px solid var(--chatto-accent);
}
```
