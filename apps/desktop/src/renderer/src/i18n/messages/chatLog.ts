import { defineMessages } from '../define';

/** Chat lines in the control panel (overview and chat log). */
export default defineMessages({
  'zh-TW': {
    roles: { broadcaster: '實況主', moderator: '管理員', vip: 'VIP', subscriber: '訂閱' },
    deleted: '已刪除',
    separator: '：',
    recipients: (count: number) => `收到的人（${count}）`,
  },
  en: {
    roles: { broadcaster: 'Streamer', moderator: 'Mod', vip: 'VIP', subscriber: 'Sub' },
    deleted: 'Deleted',
    separator: ': ',
    recipients: (count: number) => `Recipients (${count})`,
  },
  ja: {
    roles: { broadcaster: '配信者', moderator: 'モデレーター', vip: 'VIP', subscriber: 'サブスク' },
    deleted: '削除済み',
    separator: '：',
    recipients: (count: number) => `受け取った人（${count}）`,
  },
});
