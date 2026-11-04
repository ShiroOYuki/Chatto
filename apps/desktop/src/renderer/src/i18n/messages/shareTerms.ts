import { defineMessages } from '../define';

/**
 * Terms of Use and Privacy Notice of theme sharing (GitHub #4). Changing them means bumping
 * `SHARE_TERMS_VERSION`, so signed-in users are asked to agree again.
 */
export default defineMessages({
  'zh-TW': {
    terms: {
      title: 'Chatto 分享平台使用條款',
      items: [
        '適用範圍：本條款適用於 Chatto App 內的主題分享功能（瀏覽、安裝、投稿、按讚、檢舉）。不登入也能瀏覽與安裝；登入即表示同意本條款與隱私說明。',
        '帳號：你透過 Twitch、Google 或 Discord 登入，Chatto 不保存你的密碼。你要對帳號內的行為負責。',
        '投稿內容：你保證擁有投稿內容（包含圖片與自訂 CSS）的權利，或已取得授權。投稿即同意以 CC BY 4.0 授權，任何人都可以使用、修改、再分享，但需標示原作者，Chatto 會自動標示。不得投稿違法、侵權、色情、仇恨、騷擾或惡意內容，也不得試圖追蹤或傷害安裝者。',
        '上架與下架：主題通過自動檢查即上架，不經人工審核。Chatto 可以在不另行通知的情況下隱藏或刪除主題、封鎖帳號。你可以隨時下架自己的主題；已被他人安裝的副本不受影響。',
        '刪除帳號：刪除帳號後，你的主題會保留在平台上，作者改為匿名。若要一併移除，請先自行下架。',
        '檢舉與申訴：一般問題請使用 App 內的檢舉功能；版權申訴或帳號問題請寄信到 cielwork518@gmail.com。',
        '無擔保：分享平台依現況提供，可能中斷、變更或停止服務。安裝的主題由投稿者提供，Chatto 不保證其內容。',
        '條款變更：條款修改後，下次登入時會請你重新同意。',
      ],
    },
    privacy: {
      title: 'Chatto 分享平台隱私說明',
      items: [
        '登入時取得：登入平台提供的使用者 id 與顯示名稱。不取得 email、密碼或聊天內容；登入用的平台憑證不會保存。',
        '帳號資料：顯示名稱、綁定的登入方式、你投稿的主題、按讚與檢舉紀錄。',
        '匿名資料：App 會產生一個隨機 id，用來計算下載數（同一天只算一次）。這筆紀錄每天彙總成數字後刪除。',
        '連線紀錄：為了防止濫用，IP 位址只以雜湊形式暫存，幾分鐘後失效。',
        '公開資訊：你投稿的主題、作者顯示名稱、按讚數、下載數是公開的。',
        '服務提供者：資料存放在 Cloudflare。',
        '刪除：你可以在 App 內刪除帳號，帳號與綁定資料會刪除，主題依使用條款處理。',
      ],
    },
  },
  en: {
    terms: {
      title: 'Chatto Theme Sharing — Terms of Use',
      items: [
        'Scope: These terms apply to the theme sharing features in the Chatto app (browsing, installing, publishing, liking and reporting). You can browse and install without signing in. By signing in, you agree to these terms and the privacy notice.',
        'Account: You sign in with Twitch, Google or Discord. Chatto does not store your password. You are responsible for what happens under your account.',
        'Published content: You confirm that you own the rights to what you publish (including images and custom CSS), or have permission to use it. By publishing, you license your theme under CC BY 4.0: anyone may use, modify and share it, as long as they credit the original author. Chatto credits authors automatically. Do not publish content that is illegal, infringing, sexual, hateful, harassing or malicious, and do not try to track or harm the people who install your theme.',
        'Publishing and removal: Themes go live once they pass automated checks; there is no manual review. Chatto may hide or delete themes and suspend accounts without notice. You can unpublish your own themes at any time; copies others have already installed are not affected.',
        'Deleting your account: When you delete your account, your themes stay on the platform and the author is shown as anonymous. To remove them as well, unpublish them first.',
        'Reports and requests: Use the report button in the app for general issues. For copyright claims or account issues, email cielwork518@gmail.com.',
        'No warranty: Theme sharing is provided as is and may be interrupted, changed or discontinued. Themes are provided by their authors, and Chatto makes no guarantees about their content.',
        'Changes: When these terms change, you will be asked to agree again the next time you sign in.',
      ],
    },
    privacy: {
      title: 'Chatto Theme Sharing — Privacy Notice',
      items: [
        'When you sign in: We receive your user id and display name from the platform you sign in with. We do not receive your email, password or chat content, and we do not keep the platform credentials used to sign in.',
        'Account data: Your display name, linked sign-in methods, the themes you publish, and your likes and reports.',
        'Anonymous data: The app creates a random id to count downloads (once per day per theme). These records are summarized into totals and deleted every day.',
        'Connection data: To prevent abuse, IP addresses are stored only as hashes and expire within minutes.',
        'Public information: The themes you publish, your display name as author, and their like and download counts are public.',
        'Service provider: Data is stored on Cloudflare.',
        'Deletion: You can delete your account in the app. Your account and linked sign-in data are deleted; your themes are handled as described in the terms.',
      ],
    },
  },
});
