# 日文翻譯指引

Chatto 是 Windows 上給實況主／VTuber 用的 Twitch 聊天室工具：桌面上透明置頂的聊天室 Overlay、給 OBS 用的聊天室頁面、事件提醒 Overlay、可細調的聊天室主題、主題分享平台（探索頁）。品牌象徵是茶杯（チャット ≈ お茶＋chat）。

日文介面（#55）的翻譯原則與用語表。新增或修改介面文字時，`defineMessages()` 與 `Localized` 物件的 `ja` 一起寫（型別會檢查結構和繁中一致），網站（`apps/site/src/content.mjs`）與更新紀錄（`changelog.mjs` 的 `t(en, zh, ja)`）也是。目前的日文是 Claude 初譯，還沒經過母語者校對；改善意見照這份用語表統一。

## 原則

- 從繁中與英文兩個版本一起理解意思再翻，不要逐字翻。自然的日本語 UI 文字，像日本的 App 那樣。
- 文體：說明句、提示、錯誤用「です／ます」調；按鈕、選單、標籤、標題用名詞或動詞原形（例：「保存」「キャンセル」「テーマを選ぶ」）。
- 只有一句的說明、提示、caption 句尾**不加**「。」；多句的段落每句都用「。」結尾（和繁中、英文版的規則一致：繁中有句號就加、沒有就不加）。
- 不用驚嘆號堆疊。語氣溫和、簡短，動詞開頭的按鈕文字。
- 保留程式碼、變數、佔位符原樣：`{user}`、`${name}`、`{file}`、`.chattotheme`、`OBS`、`Twitch`、`CSS`、`VSCode`、反引號內容、HTML class 名稱。函式型的訊息（`(name: string) => \`...\``）保留同樣的參數與插值。
- 數字格式：繁中用 `toLocaleString('zh-TW')` 的地方，日文用 `toLocaleString('ja')`。日文不分單複數。
- 括號用全形「（）」；引號用「」；列舉用「、」。英數字與日文之間不加空格（例外：保持既有的半形英文詞，如「OBS ブラウザソース」中間的半形空格可保留）。
- 法律文字（條款、隱私）要忠實、正式（である調也可，但同一份文件內統一），不要省略條件。

## 用語表（一致使用）

| 繁中                                 | English                           | 日本語                                                             |
| ------------------------------------ | --------------------------------- | ------------------------------------------------------------------ |
| 聊天室                               | chat                              | チャット                                                           |
| 桌面 Overlay                         | desktop overlay                   | デスクトップオーバーレイ                                           |
| 事件 Overlay                         | alert overlay                     | アラートオーバーレイ                                               |
| Overlay                              | overlay                           | オーバーレイ                                                       |
| OBS 瀏覽器來源                       | OBS browser source                | OBS ブラウザソース                                                 |
| 主題                                 | theme                             | テーマ                                                             |
| 內建主題                             | built-in theme                    | 内蔵テーマ                                                         |
| 自訂主題                             | custom theme                      | カスタムテーマ                                                     |
| 主題包                               | theme package                     | テーマパッケージ                                                   |
| 自訂 CSS                             | custom CSS                        | カスタム CSS                                                       |
| 主題編輯器                           | theme editor                      | テーマエディター                                                   |
| 九宮格圖片外框                       | 9-slice image frame               | 9スライス画像フレーム                                              |
| 外框                                 | frame                             | フレーム                                                           |
| 事件                                 | event                             | イベント                                                           |
| 提醒                                 | alert                             | アラート                                                           |
| 沉寂提醒（聊天室安靜一陣子後的提醒） | quiet-spell reminder              | 静寂アラート（說明時：チャットがしばらく静かだったあとのお知らせ） |
| 新留言（標籤）                       | New                               | 新着                                                               |
| 留言／訊息                           | message                           | メッセージ                                                         |
| 觀眾                                 | viewer                            | 視聴者                                                             |
| 實況主                               | streamer                          | 配信者                                                             |
| 直播                                 | stream                            | 配信                                                               |
| 開台                                 | go live                           | 配信を始める                                                       |
| 頻道                                 | channel                           | チャンネル                                                         |
| 訂閱                                 | sub / subscribe                   | サブスク                                                           |
| 續訂                                 | resub                             | サブスク継続                                                       |
| 贈送訂閱／贈訂                       | gift sub                          | ギフトサブ                                                         |
| 小奇點                               | Bits / cheer                      | ビッツ（cheer 的動作：応援）                                       |
| 揪團                                 | raid                              | レイド                                                             |
| 公告                                 | announcement                      | アナウンス                                                         |
| 忠誠點數                             | Channel Points                    | チャンネルポイント                                                 |
| 兌換                                 | redemption / redeem               | 引き換え                                                           |
| 獎勵                                 | reward                            | 報酬                                                               |
| 表情符號                             | emote                             | エモート                                                           |
| 徽章                                 | badge                             | バッジ                                                             |
| 管理員                               | moderator                         | モデレーター                                                       |
| 實況主身分                           | broadcaster                       | 配信者                                                             |
| 禁言／封鎖                           | timeout / ban                     | タイムアウト／BAN                                                  |
| 刪除訊息                             | delete message                    | メッセージを削除                                                   |
| 連線                                 | connect                           | 接続                                                               |
| 中斷連線                             | disconnect                        | 切断                                                               |
| 登入／登出                           | sign in / sign out                | ログイン／ログアウト                                               |
| 帳號                                 | account                           | アカウント                                                         |
| 總覽                                 | Overview                          | ホーム                                                             |
| 輸出                                 | Outputs                           | 出力                                                               |
| 探索                                 | Explore                           | 見つける                                                           |
| 設定                                 | Settings                          | 設定                                                               |
| 一般／外觀／進階／關於               | General/Appearance/Advanced/About | 一般／外観／詳細／情報                                             |
| 精簡模式／完整模式                   | compact / full mode               | コンパクトモード／フルモード                                       |
| 系統匣                               | tray                              | タスクトレイ                                                       |
| 控制台（Chatto 主視窗）              | control panel / Chatto            | Chatto（主視窗統稱「Chatto」或「コントロールパネル」）             |
| 匯入／匯出                           | import / export                   | インポート／エクスポート                                           |
| 投稿（分享平台）                     | publish                           | 投稿                                                               |
| 檢舉                                 | report                            | 通報                                                               |
| 按讚                                 | like                              | いいね                                                             |
| 下載                                 | download                          | ダウンロード                                                       |
| 更新                                 | update                            | アップデート（App 版本更新）；資料更新用「更新」                   |
| 快捷鍵                               | shortcut                          | ショートカット                                                     |
| 預覽                                 | preview                           | プレビュー                                                         |
| 亮色／暗色                           | light / dark                      | ライト／ダーク                                                     |
| 抹茶玻璃                             | Matcha Glass                      | 抹茶ガラス                                                         |
| 和紙                                 | Washi Paper                       | 和紙                                                               |
| 泡泡                                 | Bubbles                           | バブル                                                             |
| 極簡描邊                             | Outline                           | アウトライン                                                       |
| 暖簾                                 | Noren                             | のれん                                                             |
| 終端機                               | Terminal                          | ターミナル                                                         |
| 茶葉框                               | Tea Leaf Frame                    | 茶葉フレーム                                                       |
| 匿名觀眾                             | an anonymous user                 | 匿名の視聴者                                                       |
| 第三方（7TV 等）                     | third-party                       | サードパーティ                                                     |
