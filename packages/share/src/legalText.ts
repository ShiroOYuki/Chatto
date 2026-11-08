/**
 * Legal text shared by the app and the website (apps/site): the theme sharing terms and privacy
 * notice, and the app's disclaimer. No imports, so the site's build script can load it as is.
 * Changing the sharing terms or privacy notice means bumping `SHARE_TERMS_VERSION`.
 */

/** The same list as `Locale` in `@chatto/core`, written out so this file needs no imports. */
export type LegalLocale = 'zh-TW' | 'en' | 'ja';

/** A titled list; each item starts with a short label before `：` or `: `. */
export interface LegalList {
  title: string;
  items: string[];
}

export interface LegalParagraph {
  title: string;
  body: string;
}

/** When the texts below last changed, as shown on the website. */
export const LEGAL_UPDATED = '2026-11-09';

export const SHARE_TERMS_TEXT: Record<LegalLocale, { terms: LegalList; privacy: LegalList }> = {
  'zh-TW': {
    terms: {
      title: 'Chatto 分享平台使用條款',
      items: [
        '適用範圍：本條款適用於 Chatto App 內的主題分享功能（瀏覽、安裝、投稿、按讚、檢舉）。不登入也能瀏覽與安裝；登入即表示同意本條款與隱私說明。',
        '帳號：你透過 Twitch、Google 或 Discord 登入，Chatto 不保存你的密碼。你要對帳號內的行為負責。',
        '投稿內容：你保證擁有投稿內容（包含圖片與自訂 CSS）的權利，或已取得授權。投稿即同意以 CC BY 4.0 授權，任何人都可以使用、修改、再分享，但需標示原作者，Chatto 會自動標示。不得投稿違法、侵權、色情、仇恨、騷擾或惡意內容，也不得試圖追蹤或傷害安裝者。',
        '上架與下架：主題通過自動檢查即上架，不經人工審核。Chatto 可以在不另行通知的情況下隱藏或刪除主題、封鎖帳號。你可以隨時下架自己的主題；已被他人安裝的副本不受影響。',
        '刪除帳號：刪除帳號後，你的主題會保留在平台上，作者改為匿名。若要一併移除，請先自行下架。',
        '檢舉與申訴：一般問題請使用 App 內的檢舉功能；版權申訴或帳號問題請寄信到 support@chattolive.com。',
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
        'Reports and requests: Use the report button in the app for general issues. For copyright claims or account issues, email support@chattolive.com.',
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
  ja: {
    terms: {
      title: 'Chattoテーマ共有 利用規約',
      items: [
        '適用範囲：本規約は、Chattoアプリ内のテーマ共有機能（閲覧、インストール、投稿、いいね、通報）に適用されます。閲覧とインストールはログインしなくても利用できます。ログインした時点で、本規約とプライバシーポリシーに同意したものとみなします。',
        'アカウント：ログインにはTwitch、Google、Discordのいずれかを使用します。Chattoはパスワードを保存しません。アカウントで行われた行為については、利用者が責任を負います。',
        '投稿コンテンツ：利用者は、投稿するコンテンツ（画像とカスタム CSSを含みます）について権利を有しているか、権利者から許諾を得ていることを保証するものとします。投稿することにより、利用者はそのテーマをCC BY 4.0でライセンスすることに同意したものとし、原作者の表示を条件として、誰でもそのテーマを使用、改変、再共有できます。作者の表示はChattoが自動で行います。違法、権利侵害、性的、差別的・憎悪的、嫌がらせ、または悪意のあるコンテンツを投稿してはならず、テーマをインストールした人を追跡したり害したりしようとしてはなりません。',
        '公開と削除：テーマは自動チェックを通過した時点で公開され、人による審査は行いません。Chattoは、事前の通知なくテーマを非表示にし、もしくは削除し、またはアカウントを停止することがあります。利用者は自分のテーマをいつでも非公開にできます。ただし、すでにほかの人がインストールしたコピーには影響しません。',
        'アカウントの削除：アカウントを削除しても、投稿したテーマはプラットフォームに残り、作者は匿名として表示されます。テーマもあわせて削除したい場合は、アカウントを削除する前に非公開にしてください。',
        '通報と申し立て：一般的な問題はアプリ内の通報機能をご利用ください。著作権に関する申し立てやアカウントに関する問題は、support@chattolive.comまでメールでご連絡ください。',
        '無保証：テーマ共有は現状のまま提供され、中断、変更または終了することがあります。インストールされるテーマは投稿者が提供するものであり、Chattoはその内容を保証しません。',
        '規約の変更：本規約を変更した場合、次回のログイン時に改めて同意をお願いします。',
      ],
    },
    privacy: {
      title: 'Chattoテーマ共有 プライバシーポリシー',
      items: [
        'ログイン時に取得する情報：ログインに使用したプラットフォームから、ユーザーIDと表示名を受け取ります。メールアドレス、パスワード、チャットの内容は受け取りません。また、ログインに使用したプラットフォームの認証情報は保存しません。',
        'アカウント情報：表示名、連携しているログイン方法、投稿したテーマ、いいねと通報の記録。',
        '匿名データ：ダウンロード数を数えるため、アプリはランダムなIDを生成します（1つのテーマにつき1日1回のみ数えます）。この記録は毎日集計して数値にしたあと削除します。',
        '接続記録：不正利用を防ぐため、IPアドレスはハッシュ化した形でのみ一時的に保存し、数分で失効します。',
        '公開される情報：投稿したテーマ、作者としての表示名、いいね数とダウンロード数は公開されます。',
        'サービス提供者：データはCloudflareに保存されます。',
        '削除：アプリ内でアカウントを削除できます。アカウントと連携しているログイン方法の情報は削除され、テーマは利用規約に従って取り扱います。',
      ],
    },
  },
};

/** The app's disclaimer (settings → About → Licenses). */
export const APP_DISCLAIMER: Record<LegalLocale, LegalParagraph[]> = {
  'zh-TW': [
    {
      title: '不提供擔保',
      body: 'Chatto 依「現狀」提供，不附任何明示或默示的擔保，包括適售性與特定用途適用性。在法律允許的範圍內，作者不對使用或無法使用 Chatto 造成的任何損害負責，例如直播中斷、資料遺失或畫面錯誤。完整條款見 GPL-3.0 第 15、16 條。',
    },
    {
      title: '非官方軟體',
      body: 'Chatto 是個人開發的開源專案，與各直播平台（例如 Twitch Interactive, Inc.）及 OBS Project 沒有關聯，也沒有獲得它們的認可或贊助。各平台、OBS 的名稱與商標屬於各自的擁有者。',
    },
    {
      title: '資料處理',
      body: 'Chatto 只向直播平台要求讀取聊天室所需的權限（例如 Twitch 的聊天室與忠誠點數兌換）。直播平台的登入憑證（token）以 Windows 的加密功能存在你的電腦上，不會傳給其他人。Chatto 不蒐集使用資料；只會連到你登入的直播平台（登入與讀取聊天室）、GitHub（檢查與下載更新），以及使用主題分享時的分享服務（api.chattolive.com，架設在 Cloudflare）。分享服務只在你登入 Chatto 帳號後保存帳號資料，詳見帳號頁或 chattolive.com/zh-tw/privacy 的隱私說明。本機伺服器只在 127.0.0.1 提供 Overlay 與 OBS 畫面，區網內的其他裝置讀不到。',
    },
    {
      title: '內容責任',
      body: '直播畫面上的聊天內容來自觀眾。實況主需自行管理聊天室並遵守平台規範；Chatto 會即時移除被刪除或封鎖的訊息，但不對聊天內容負責。',
    },
  ],
  en: [
    {
      title: 'No warranty',
      body: 'Chatto is provided "as is", without warranty of any kind, express or implied, including merchantability and fitness for a particular purpose. To the extent permitted by law, the author is not liable for any damage from using or being unable to use Chatto, such as an interrupted stream, lost data or a broken overlay. See sections 15 and 16 of the GPL-3.0 for the full terms.',
    },
    {
      title: 'Unofficial software',
      body: 'Chatto is an independent open source project. It is not affiliated with, endorsed by or sponsored by any streaming platform (such as Twitch Interactive, Inc.) or the OBS Project. Platform names, OBS and other trademarks belong to their owners.',
    },
    {
      title: 'Your data',
      body: 'Chatto only asks streaming platforms for the permissions it needs to read chat (on Twitch, chat and channel points redemptions). Your streaming platform sign-in tokens are encrypted with Windows and stay on your computer; they are never sent to anyone else. Chatto collects no usage data. It only connects to the streaming platforms you sign in to (sign-in and reading chat), GitHub (checking for and downloading updates) and, when you use theme sharing, the sharing service (api.chattolive.com, hosted on Cloudflare). The sharing service keeps account data only once you sign in to a Chatto account; see the Privacy Notice on the Accounts page or at chattolive.com/privacy. Its local server serves the overlay and OBS on 127.0.0.1 only, so other devices on your network cannot read it.',
    },
    {
      title: 'Chat content',
      body: 'Chat shown on stream comes from viewers. Streamers are responsible for moderating their chat and following platform rules; Chatto removes deleted and banned messages right away but is not responsible for what chatters write.',
    },
  ],
  ja: [
    {
      title: '無保証',
      body: 'Chattoは「現状のまま」提供され、商品性および特定目的への適合性を含め、明示または黙示を問わずいかなる保証もありません。法律で認められる範囲において、作者は、Chattoの使用または使用できないことにより生じたいかなる損害（配信の中断、データの消失、画面表示の不具合など）についても責任を負いません。完全な条件はGPL-3.0の第15条および第16条をご覧ください。',
    },
    {
      title: '非公式ソフトウェア',
      body: 'Chattoは個人が開発するオープンソースプロジェクトであり、各配信プラットフォーム（Twitch Interactive, Inc.など）およびOBS Projectとは関係がなく、それらによる承認や後援も受けていません。各プラットフォームおよびOBSの名称と商標は、それぞれの所有者に帰属します。',
    },
    {
      title: 'データの取り扱い',
      body: 'Chattoが配信プラットフォームに要求するのは、チャットの読み取りに必要な権限（Twitchではチャットとチャンネルポイントの引き換え）のみです。配信プラットフォームのログイン認証情報（トークン）はWindowsの暗号化機能で暗号化してお使いのパソコンに保存し、ほかの誰にも送信しません。Chattoは利用状況のデータを収集しません。接続先は、ログインした配信プラットフォーム（ログインとチャットの読み取り）、GitHub（アップデートの確認とダウンロード）、およびテーマ共有を使う場合の共有サービス（api.chattolive.com、Cloudflare上で運用）のみです。共有サービスがアカウント情報を保存するのは、Chattoアカウントにログインした場合に限られます。詳しくはアカウントページ、またはchattolive.com/ja/privacyのプライバシーポリシーをご覧ください。ローカルサーバーはオーバーレイとOBS用の画面を127.0.0.1でのみ提供するため、同じネットワーク内のほかの端末からは読み取れません。',
    },
    {
      title: 'チャットの内容',
      body: '配信画面に表示されるチャットの内容は視聴者によるものです。配信者は自らチャットを管理し、各プラットフォームの規約を守る必要があります。Chattoは削除またはBANされたメッセージをすぐに画面から消しますが、チャットの内容については責任を負いません。',
    },
  ],
};
