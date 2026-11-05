import { defineMessages } from '../define';

/** Channel points redemptions: the list on the overview and chat pages, and the permission notes. */
export default defineMessages({
  'zh-TW': {
    title: '兌換紀錄',
    empty: '還沒有人兌換獎勵',
    points: (points: number) => `${points.toLocaleString('zh-TW')} 點`,
    dismiss: (reward: string) => `關閉「${reward}」`,
    reauth: '重新登入以啟用兌換提醒',
    reauthHint: 'Chatto 現在也能顯示忠誠點數兌換，要在 Twitch 授權一次',
    signInAgain: '重新登入',
    notBroadcaster: '只有用實況主帳號登入時才能收到兌換',
    showInObs: '顯示在 OBS',
    showInObsHint: '關閉後只顯示在桌面 Overlay 和控制台',
  },
  en: {
    title: 'Redemptions',
    empty: 'No redemptions yet',
    points: (points: number) => `${points.toLocaleString('en')} ${points === 1 ? 'point' : 'points'}`,
    dismiss: (reward: string) => `Close ${reward}`,
    reauth: 'Sign in again to get redemption alerts',
    reauthHint: 'Chatto can now show channel points redemptions; approve it once on Twitch',
    signInAgain: 'Sign in again',
    notBroadcaster: 'Redemptions only arrive when you sign in with the streamer account',
    showInObs: 'Show in OBS',
    showInObsHint: 'When off, they show only on the desktop overlay and in Chatto',
  },
});
