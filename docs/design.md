# 控制台設計準則

這份文件整理控制台（`apps/desktop/src/renderer`）的視覺與互動準則。聊天室本身的外觀由主題決定，見 [`theming.md`](theming.md)；品牌、吉祥物與插圖的美術方向見 [`visual-identity.md`](visual-identity.md)。

新增或修改介面時，先看這份文件，再參考現有頁面的寫法。規則和程式碼不一致時，以程式碼為準，並回頭更新這份文件。

## 原則

1. **簡潔直觀**：一眼看得出狀態和下一步。實況中切過來的人沒有時間讀說明。
2. **資訊優先**：數字、狀態、名稱要清楚可讀。裝飾不能擠掉資訊，也不能降低對比。
3. **可愛只點綴**：茶杯吉祥物、空狀態、連線成功的小動畫、親切的提示文字。只放在不干擾操作的地方。
4. **安靜的動態**：動畫只用來交代「什麼變了」，不為了吸引注意而動。
5. **預覽即實際畫面**：控制台裡的聊天預覽要和 Overlay、OBS 看到的一樣。

## 色彩

主色系是抹茶綠，亮色與暗色都要支援。顏色一律用 token（`styles.css`），不要在元件裡寫色碼。

| Token（Tailwind） | 用途                                                | 亮色      | 暗色      |
| ----------------- | --------------------------------------------------- | --------- | --------- |
| `canvas`          | 頁面底色；輸入框、選擇卡片的底色                    | `#f3f6ef` | `#121512` |
| `tile`            | Tile、對話框、選單的底色；選中項目的浮起高亮        | `#ffffff` | `#1b201a` |
| `tile-muted`      | Tile 內的次要區塊、segmented 底、徽章底、hover 底色 | `#eaf1e2` | `#232a21` |
| `sidebar`         | 左側導覽底色                                        | `#e9efe2` | `#161a15` |
| `line`            | 框線、分隔線、未開啟的開關                          | `#e1e8d9` | `#2c3429` |
| `ink`             | 主要文字                                            | `#1d2a14` | `#eaf3de` |
| `ink-soft`        | 次要文字、Tile 標題、未選中的導覽                   | `#55634a` | `#b3c0a6` |
| `ink-faint`       | 提示、caption、未選中的圖示                         | `#8d9884` | `#7b8773` |
| `matcha`          | 強調：選中的圖示、開關開啟、滑桿、focus ring        | `#6b9b2e` | `#97c459` |
| `matcha-strong`   | 主要按鈕、Hero tile 底色、成功訊息文字              | `#27500a` | `#c0dd97` |
| `matcha-soft`     | 淡強調底：徽章、hover、選中卡片（常搭配透明度）     | `#c0dd97` | `#3b6d11` |
| `on-matcha`       | `matcha-strong` 上的文字                            | `#f4f9ee` | `#10200a` |
| `sakura`          | 點綴：吉祥物腮紅、「有新版本」這類提醒徽章          | `#f4c0d1` | `#993556` |
| `danger`          | 錯誤、刪除                                          | `#c2412d` | `#f09595` |

- shadcn/ui 的語意 token（`primary`、`muted`、`destructive`、`border`、`ring` …）已對應到上表，CLI 加進來的元件會自動符合配色。
- 外觀設定（`prefs.appearance`）是 `system`／`light`／`dark`，`App.tsx` 把結果寫進 `<html data-theme>`；`dark:` variant 跟著 `data-theme`。
- 透明度用 Tailwind 的 `/` 寫法調 token（`bg-matcha-soft/50`、`bg-danger/10`），不要另外調色。
- 新增 token 時，亮色、暗色（兩個區塊）都要補，必要時也對應到 shadcn 的語意 token。
- 目前寫死顏色的地方只有：連線彩紙的三個綠色、Hero 裡茶杯底的 `#f4f9ee`（暗色時也維持淺底）、連線中的琥珀色 spinner。不要再增加。

## 字型與字級

- 介面字型是本地打包的 jf open 粉圓（Huninn），等寬字型是 JetBrains Mono。不從外部載入字型。
- 數字（統計、速率、滑桿讀數、版本、port）用 `font-mono` 加 `tabular-nums`，跳動時寬度才不會晃。
- 網址、CSS、指令、class 名稱用 `font-mono`。

| 層級          | 寫法                                      | 例子                 |
| ------------- | ----------------------------------------- | -------------------- |
| 頁面標題      | `text-2xl font-semibold tracking-tight`   | `PageHeader`         |
| 頁面說明      | `text-sm text-ink-soft`                   | `PageHeader`         |
| Tile 標題     | `text-sm font-medium text-ink-soft`＋圖示 | `Tile title`         |
| 區塊、列標題  | `text-sm font-medium`                     | 設定頁的列、外掛面板 |
| 內文          | `text-sm`                                 |                      |
| 提示、caption | `text-xs text-ink-faint`                  | 欄位說明、空狀態提示 |
| 徽章          | `text-[11px] font-medium`                 | `Badge`              |
| 大數字        | `font-mono text-3xl`～`text-6xl`          | 統計 tile、Hero 速率 |

- 粗細只用 `font-normal`、`font-medium`、`font-semibold`。

## 形狀與間距

### 圓角

| 對象                                    | 圓角                   |
| --------------------------------------- | ---------------------- |
| Tile、確認對話框                        | `rounded-tile`（20px） |
| Tile 內的區塊、按鈕、輸入框、選單、卡片 | `rounded-xl`（12px）   |
| 小按鈕（`size="sm"`）                   | 10px                   |
| segmented 裡的選項、選單項目            | `rounded-lg`           |
| 徽章、狀態膠囊、圓形 icon 按鈕          | `rounded-full`         |
| `Modal`                                 | `rounded-2xl`          |

- 不要再用全圓角的按鈕、輸入框或 segmented（2026-11 已統一改成 12px）。

### 間距

- 頁面：內距 `p-6`，最大寬度 `max-w-[1360px]` 置中；精簡模式 `p-4`、`max-w-[1280px]`。
- Bento 格子之間 `gap-3`。
- Tile 內距 `p-5`；Tile 標題和內容之間 `mb-3`。
- Tile 內的次要區塊：`rounded-xl bg-tile-muted px-4 py-2.5`～`py-3`，彼此間隔 `gap-2`。
- 設定列：`py-4`，列之間用 `border-b border-line` 分隔，最後一列不畫線。

### 層次

- 層次靠底色區分：`canvas` → `tile`（加 `border-line`）→ `tile-muted`。
- 陰影只用在「浮起」的東西：選中項目的高亮（`shadow-sm`）、`raised` 按鈕、對話框（`shadow-xl`）。Tile 本身不加陰影。
- Hero tile 用 `bg-matcha-strong` 加 `text-on-matcha`，一頁最多一個。

## 版面

### 視窗與模式

- 視窗最小 960×640（扣掉標題列約 596 高）、預設 1280×820，另外要檢查 1920×1080。
- 主視窗 frameless，自繪標題列：可拖曳區域用 `.app-drag`，裡面能點的東西加 `.app-no-drag`。
- **完整模式**：左側導覽（寬 `w-56`）＋內容區。設定放在左下角，和主要頁面分開。
- **精簡模式**：單頁 Bento，四欄。

### Bento 格狀

- 頁面用 CSS grid 排 `Tile`，外層包 `Stagger`，Tile 依序浮現。
- **填滿視窗的頁面**（總覽、聊天室、主題）：grid 設 `h-full` 和 `min-h-[...]`，用 `grid-rows-[...]` 讓內容列取內容高度、主要列吃掉剩下的空間；低於最小高度時整頁捲動，不擠壓 Tile。這類頁面要加進 `App.tsx` 的 `fillsViewport`。
- **一般頁面**：內容多就整頁捲動。
- 長清單在 Tile 內捲動（`min-h-0 flex-1 overflow-y-auto`），還有內容被切掉的那一側用 mask 淡出（`mask-b-from-[calc(100%-2rem)]`、`mask-t-from-...`），讓人知道可以捲。下方是否還有內容用 `components/useMoreBelow.ts` 判斷。
- 有左側選單的頁面（設定、主題編輯器）用 kit `SideNavItem`，內容在內層捲動。

### 窄視窗

- 斷點是 `max-[1180px]:`，處理 960～1180 寬的視窗。
- 窄的時候先收掉裝飾（例如 Hero 的茶杯），再收 padding、改直排，最後才換元件（主題編輯器的左側選單換成下拉選單 `EditorNavSelect`）。
- 文字用 `truncate` 處理過長的頻道名稱、主題名稱，容器要有 `min-w-0`。
- 一排按鈕放不下時，次要的按鈕可以只留圖示（文字包 `max-[1180px]:sr-only`，按鈕加 `Hint`），例如帳號頁的「刪除帳號」、聊天室的「暫停」。
- 一列塞了很多控制項時（提醒頁的事件規則），窄視窗改成兩行：第一行名稱與主要設定，第二行其餘控制項，和名稱對齊。
- 主題編輯器的欄位列有說明時，窄視窗改成標籤在上、控制項在下（開關除外）。

## 元件

頁面只用 `components/kit/`（由 `kit/index.ts` 匯出）。kit 包住 shadcn/ui、Magic UI、Kibo UI，換底層元件不必改頁面。kit 沒有的元件，先考慮能不能加進 kit。

| 元件                                     | 用途                                                   |
| ---------------------------------------- | ------------------------------------------------------ |
| `Tile`                                   | Bento 格子；可帶 `title`、`icon`、右上角 `action`      |
| `PageHeader`                             | 頁面標題、說明、右側動作                               |
| `EmptyState`                             | 空狀態：茶杯＋一句標題＋一句提示                       |
| `Button`                                 | 見下方「按鈕」                                         |
| `Toggle`                                 | 立即生效的開關；一定要傳 `label`（`aria-label`）       |
| `Segmented`                              | 2～4 個互斥選項，選項短；高亮會滑動                    |
| `ChoiceCards`                            | 需要說明文字的互斥選項                                 |
| `Select`                                 | 選項多、或選項是資料（主題、語言）；可用 `groups` 分組 |
| `Slider`                                 | 有範圍的數值，右側顯示讀數與單位                       |
| `Field`、`TextInput`、`TagsField`        | 表單欄位；欄位標籤在上、說明在下                       |
| `CopyField`                              | 唯讀值加複製按鈕（網址）                               |
| `Badge`                                  | 狀態標籤；`neutral`／`matcha`／`sakura`／`danger`      |
| `ActionNote`                             | 動作結果：圖示＋淡色底，`ok`／`error`，出現時淡入      |
| `StatusDot`、`StatusPill`、`channelTone` | 連線狀態                                               |
| `LoadingSpinner`                         | 按鈕、行內的載入中                                     |
| `Hint`                                   | icon 按鈕的 tooltip                                    |
| `Modal`                                  | 內容型對話框（例如授權）                               |
| `SideNavItem`                            | 頁內左側選單的一項                                     |
| `Sparkline`                              | 訊息速率的小長條圖                                     |

### 按鈕

| variant     | 什麼時候用                                                   |
| ----------- | ------------------------------------------------------------ |
| `primary`   | 這個區塊最主要的動作（安裝、登入、複製），一個區塊最多一個   |
| `secondary` | 一般動作（預設）                                             |
| `raised`    | 放在 `tile-muted` 這類淡底上，`secondary` 會和背景混在一起時 |
| `ghost`     | Tile 右上角的「前往」連結、次要動作（解除安裝）              |
| `danger`    | 刪除、移除；真正會丟資料的動作要再經過確認對話框             |

- 尺寸：Tile 標題列、面板裡的動作用 `sm`；頁面主要動作用 `md`；`lg` 只給需要特別大的入口。
- 「前往某頁」的按鈕在文字後面加 `ArrowRight`。
- icon 按鈕外面包 `Hint`，按鈕本身也要有 `aria-label`（tooltip 不算名稱）。
- 動作進行中：按鈕 `disabled`，必要時加 `LoadingSpinner`；不要讓人重複按。
- 游標：可點的元素（按鈕、連結、開關、分頁、選單項、下拉選單、核取方塊）由 `styles.css` 的全域規則顯示 pointer，停用的（`disabled`、`aria-disabled`）維持箭頭，不必逐個加 `cursor-pointer`。可點的東西要用 `<button>` 或正確的 ARIA role；用 `div` 加 `onClick` 時要自己加 `cursor-pointer`。複製進來的 shadcn 選單項原本寫死 `cursor-default`，已改成 `cursor-pointer`。

### 設定與表單

- 開關、選項變更**立即生效**，不需要「儲存」按鈕。文字欄位在失去焦點或按 Enter 時才儲存。
- 設定列：左邊標題（`text-sm font-medium`）＋一句說明（`text-xs text-ink-faint`），右邊控制項。
- 主題編輯器例外：改的是草稿，要按「儲存」才生效，未儲存時標示「尚未儲存」。

### 對話框

- 不可復原的動作（刪除主題）用 shadcn 的 `AlertDialog` 確認：標題說明要做什麼、描述說明後果、確認按鈕用 `destructive`，圓角 `rounded-xl`。
- 需要閱讀的內容用 kit `Modal`。
- 其他情況不要跳對話框，能在原地說明的就在原地說明。

## 狀態與回饋

### 連線狀態

| 語氣（`StatusTone`） | 何時               | 呈現             |
| -------------------- | ------------------ | ---------------- |
| `ok`                 | 已連線             | 綠點             |
| `warn`               | 連線中、重新連線中 | 琥珀色的 spinner |
| `error`              | 錯誤               | 紅點             |
| `idle`               | 未連線、已中斷     | 灰點             |

- 由狀態推導的判斷放在 `services/`（例如 `twitchStatus(state)`），完整模式和精簡模式共用。
- 標題列的狀態點隨時看得到，頁面裡不需要每個地方都重複顯示。

### 提示與錯誤

- 結果顯示在動作旁邊，不用 toast。一個區塊同時最多一則提示，依優先順序挑：錯誤 → 剛完成的結果 → 一般提醒（見 `ObsPluginPanel` 的 `PanelNote`）。
- 錯誤：`text-xs text-danger`，加 `role="alert"`；說明怎麼處理，不顯示原始錯誤（原始錯誤只寫 log）。
- 成功：`text-xs text-matcha-strong`。
- 使用者需要確定「做成了」的動作（安裝、檢舉、下架、管理動作）用 kit `ActionNote`：圖示＋淡色底、淡入，每次結果給新的 `key` 讓重複的結果也看得到。錯誤一樣用它（`tone="error"`，自帶 `role="alert"`）。
- 對話框裡的動作完成後就沒事可做時（投稿、檢舉），整個對話框換成確認畫面：圓形勾勾、一句標題、一句說明，加上主要按鈕（關閉或下一步）。觸發的按鈕也改成完成狀態（例如「已檢舉」），讓關掉對話框後仍看得出結果。
- 登入、連線的錯誤由 main 寫進 `AppState` 顯示；其他不需要等結果的動作用 `runAction`。

### 停用

- 不能用的控制項維持在原位、變淡，tooltip 說明為什麼不能用；不要直接藏起來讓人找不到。
- 要讓 tooltip 能顯示的停用按鈕用 `aria-disabled`（原生 `disabled` 不觸發 hover）。
- 被另一個開關關掉、但仍可預先調整的控制項（關閉音效後的音效選單、音量）只變淡（`opacity-50`），不停用；開關旁加圖示說明它管的是什麼（喇叭）。

### 空狀態與載入

- 空狀態用 `EmptyState`：茶杯（通常是 `sleepy`，有正面意味時用 `happy`）＋「還沒有…」＋一句說明東西什麼時候會出現。
- 整個 App 還沒拿到狀態時，顯示開心的茶杯和「載入中」。

## 動畫

用 Motion（`motion/react`），共用設定在 `components/motion.tsx`。不使用 Animate UI（授權與 GPL 不相容）。

| 用途                       | 寫法                                              |
| -------------------------- | ------------------------------------------------- |
| 一般互動（高亮滑動、按下） | `spring`（stiffness 420、damping 32）             |
| 進場、數值變化             | `softSpring`（stiffness 260、damping 28）         |
| 頁面切換                   | `PageTransition`：0.18 秒淡入、上移 8px、輕微模糊 |
| Tile 進場                  | `Stagger` ＋ `Tile`（`riseIn`），間隔 0.035 秒    |
| 選中項目的高亮             | 共用 `layoutId` 的背景在項目之間滑動              |
| 數字變化                   | `RollingNumber`                                   |
| 圖示切換（複製 → 打勾）    | `SwapIcon`                                        |
| 按下按鈕                   | `whileTap={{ scale: 0.97 }}`                      |

- **hover 只改顏色**，不位移、不放大、不發光（唯一的例外見下方）。
- 不做常駐的動畫，例外是吉祥物的茶煙（表示「活著」）。
- 尊重 `prefers-reduced-motion`：頁面切換不做位移、彩紙不放、茶煙停止。新的動畫也要處理。
- 已經拿掉、不要加回來的：border beam、spotlight 光暈、hover 上浮、空狀態漂浮、吉祥物搖晃、大面積彩紙。
- 例外：左側主導覽的圖示在 hover 時小晃動（`Sidebar.tsx` 的 `NavItem`），是刻意保留的唯一 hover 動態，不要套到其他元件。

## 吉祥物與可愛元素

- 茶杯（`TeaCup`）的表情反映連線狀態（`moodFor`）：`sleepy` 未連線、`happy` 已連線、`busy` 每分鐘 30 則以上、`worried` 錯誤。
- 出現的位置：左側導覽底部（加一句心情文字）、總覽 Hero、空狀態、載入畫面、OBS 外掛的連線中畫面。不要放進表單、設定列、對話框。
- 第一次連線成功時，從標題列的狀態點冒出一小團茶葉彩紙（22 片），之後不再出現。
- 親切的語氣只用在狀態與空狀態的文字（「還沒連上，先泡杯茶」）；按鈕、欄位標籤、錯誤說明保持直接。

## 圖示

- 介面圖示用 `lucide-react`。平台標誌用 Simple Icons（CC0），不要用 lucide 的近似圖示代替。
- 尺寸：主導覽 18px；Tile 標題、選單、一般按鈕 16px（`size-4`）；小按鈕、segmented 14px（`size-3.5`）。
- 選中、強調的圖示用 `text-matcha`，未選中用 `text-ink-faint`。
- 不用 emoji 當圖示，也不用 sparkles 這類裝飾圖示。

## 文案

文案的完整規則見 `CLAUDE.md`「多語系」與控制台 UI 方向。和版面直接相關的幾點：

- 簡短、動詞開頭（「更換」「開啟聊天室」「安裝 OBS 外掛」），不堆驚嘆號。
- 只有一句的說明、提示、caption 句尾不加句號；多句的段落保留句號。
- 文字不寫死在元件裡，放在 `i18n/messages/<namespace>.ts`，繁中和英文一起寫。英文通常比較長，版面要在兩種語言下都檢查（窄視窗尤其）。

## 聊天預覽

- 控制台裡的聊天預覽包在 `.chatto-root` 裡，用 `all: revert` 隔離 Tailwind preflight，看起來才會和 OBS 一樣。不要在預覽裡用 Tailwind class 修外觀。
- `ChatView` 要傳 `locale={useChatLocale()}`、`assetUrl={useThemeAssetUrl()}`，主題經過 `useOutputTheme()`。

## 新增介面時的檢查

- [ ] 只用 kit 元件與色彩 token，沒有寫死色碼或文字。
- [ ] 亮色、暗色都看過。
- [ ] 960×640、1280×820、1920×1080 都看過；繁中、英文都看過。
- [ ] icon 按鈕有 `Hint` 和 `aria-label`；開關有 `label`。
- [ ] 錯誤、空狀態、載入中、停用都有對應的畫面。
- [ ] 動畫用 `motion.tsx` 的共用設定，並處理 `prefers-reduced-motion`。
- [ ] 外觀刻意改變時，只更新受影響的 visual 基準截圖（見 [`testing.md`](testing.md)）。
