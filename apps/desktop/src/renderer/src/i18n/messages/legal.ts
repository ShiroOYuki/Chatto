import { defineMessages } from '../define';

/**
 * The disclaimer and license dialog (settings → About). The GPL text itself stays in
 * English: only the original is legally binding.
 */
export default defineMessages({
  'zh-TW': {
    title: '免責聲明與授權',
    description: 'Chatto 以 GPL-3.0-or-later 授權釋出',
    tabs: {
      disclaimer: '免責聲明',
      license: 'GPL-3.0',
      thirdParty: '第三方授權',
    },
    disclaimer: [
      {
        title: '不提供擔保',
        body: 'Chatto 依「現狀」提供，不附任何明示或默示的擔保，包括適售性與特定用途適用性。在法律允許的範圍內，作者不對使用或無法使用 Chatto 造成的任何損害負責，例如直播中斷、資料遺失或畫面錯誤。完整條款見 GPL-3.0 第 15、16 條。',
      },
      {
        title: '非官方軟體',
        body: 'Chatto 是個人開發的開源專案，與 Twitch Interactive, Inc.、OBS Project 及其他平台沒有關聯，也沒有獲得它們的認可或贊助。Twitch、OBS 等名稱與商標屬於各自的擁有者。',
      },
      {
        title: '資料處理',
        body: 'Chatto 只要求讀取聊天室的權限。登入憑證（token）以 Windows 的加密功能存在你的電腦上，不會傳給任何人。Chatto 沒有自己的伺服器，也不蒐集使用資料；只會連到 Twitch（登入與聊天室）和 GitHub（檢查與下載更新）。本機伺服器只在 127.0.0.1 提供 Overlay 與 OBS 畫面，區網內的其他裝置讀不到。',
      },
      {
        title: '內容責任',
        body: '直播畫面上的聊天內容來自觀眾。實況主需自行管理聊天室並遵守平台規範；Chatto 會即時移除被刪除或封鎖的訊息，但不對聊天內容負責。',
      },
    ],
    licenseNote: '以下為具法律效力的英文原文',
    thirdPartyNote: 'Chatto 使用的字型、音效、OBS 外掛基礎與函式庫，以及它們的授權',
  },
  en: {
    title: 'Disclaimer and licenses',
    description: 'Chatto is released under GPL-3.0-or-later',
    tabs: {
      disclaimer: 'Disclaimer',
      license: 'GPL-3.0',
      thirdParty: 'Third-party licenses',
    },
    disclaimer: [
      {
        title: 'No warranty',
        body: 'Chatto is provided "as is", without warranty of any kind, express or implied, including merchantability and fitness for a particular purpose. To the extent permitted by law, the author is not liable for any damage from using or being unable to use Chatto, such as an interrupted stream, lost data or a broken overlay. See sections 15 and 16 of the GPL-3.0 for the full terms.',
      },
      {
        title: 'Unofficial software',
        body: 'Chatto is an independent open source project. It is not affiliated with, endorsed by or sponsored by Twitch Interactive, Inc., the OBS Project or any other platform. Twitch, OBS and other names and trademarks belong to their owners.',
      },
      {
        title: 'Your data',
        body: 'Chatto only asks for permission to read chat. Your sign-in token is encrypted with Windows and stays on your computer; it is never sent to anyone. Chatto has no server of its own and collects no usage data. It only connects to Twitch (sign-in and chat) and GitHub (checking for and downloading updates). Its local server serves the overlay and OBS on 127.0.0.1 only, so other devices on your network cannot read it.',
      },
      {
        title: 'Chat content',
        body: 'Chat shown on stream comes from viewers. Streamers are responsible for moderating their chat and following platform rules; Chatto removes deleted and banned messages right away but is not responsible for what chatters write.',
      },
    ],
    licenseNote: 'The legally binding English original',
    thirdPartyNote: 'The fonts, sounds, OBS plugin base and libraries Chatto uses, and their licenses',
  },
});
