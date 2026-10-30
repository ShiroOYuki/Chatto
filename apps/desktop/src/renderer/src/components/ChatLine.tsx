import type { ChatMessage, ChatNotice, MessageFragment, UserRole } from '@chatto/core';
import { Gift, Megaphone, PartyPopper, Swords } from 'lucide-react';
import { motion } from './motion';
import { Badge } from './kit';

const ROLE_LABEL: Partial<Record<UserRole, { label: string; tone: 'matcha' | 'sakura' | 'neutral' }>> = {
  broadcaster: { label: '實況主', tone: 'sakura' },
  moderator: { label: '管理員', tone: 'matcha' },
  vip: { label: 'VIP', tone: 'sakura' },
  subscriber: { label: '訂閱', tone: 'neutral' },
};

export function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function Fragments({ fragments }: { fragments: MessageFragment[] }) {
  return (
    <>
      {fragments.map((fragment, index) => {
        switch (fragment.type) {
          case 'emote':
            return (
              <img
                key={index}
                src={fragment.emote.image.x1}
                alt={fragment.emote.name}
                title={fragment.emote.name}
                className="mx-0.5 inline-block h-6 align-middle"
              />
            );
          case 'mention':
            return (
              <span key={index} className="font-medium text-matcha">
                {fragment.text}
              </span>
            );
          case 'link':
            return (
              <span key={index} className="text-matcha underline decoration-dotted">
                {fragment.text}
              </span>
            );
          case 'cheer':
            return (
              <span key={index} className="font-semibold text-matcha">
                {fragment.text}
              </span>
            );
          default:
            return <span key={index}>{fragment.text}</span>;
        }
      })}
    </>
  );
}

/** One chat message in the control panel's log (not themed — themes are for viewers). */
export function ChatLine({
  message,
  deleted,
  showTime = true,
}: {
  message: ChatMessage;
  deleted?: boolean;
  showTime?: boolean;
}) {
  const role = message.author.roles.map((item) => ROLE_LABEL[item]).find(Boolean);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: deleted ? 0.55 : 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="group flex gap-3 rounded-xl px-3 py-1.5 text-sm transition-colors hover:bg-tile-muted"
    >
      {showTime ? (
        <time className="mt-0.5 w-10 shrink-0 font-mono text-[11px] tabular-nums text-ink-faint">
          {formatClock(message.timestamp)}
        </time>
      ) : null}
      <div className="min-w-0 flex-1 leading-relaxed break-words">
        {role ? (
          <span className="mr-1.5 align-[1px]">
            <Badge tone={role.tone}>{role.label}</Badge>
          </span>
        ) : null}
        <span className="font-semibold" style={{ color: message.author.color }}>
          {message.author.displayName}
        </span>
        <span className="text-ink-faint">：</span>
        <span className={deleted ? 'line-through' : ''}>
          <Fragments fragments={message.fragments} />
        </span>
        {deleted ? (
          <span className="ml-2 align-[1px]">
            <Badge tone="danger">已刪除</Badge>
          </span>
        ) : null}
      </div>
    </motion.div>
  );
}

const NOTICE_ICON = {
  raid: Swords,
  announcement: Megaphone,
  'gift-subscription': Gift,
} as const;

export function NoticeLine({ notice }: { notice: ChatNotice }) {
  const Icon = NOTICE_ICON[notice.kind as keyof typeof NOTICE_ICON] ?? PartyPopper;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="my-1 flex gap-3 rounded-xl border border-matcha/30 bg-matcha-soft/25 px-3 py-2 text-sm"
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-matcha" />
      <div className="min-w-0">
        <div className="font-medium">{notice.systemText}</div>
        {notice.fragments.length > 0 ? (
          <div className="text-ink-soft">
            <Fragments fragments={notice.fragments} />
          </div>
        ) : null}
      </div>
      <time className="ml-auto shrink-0 font-mono text-[11px] text-ink-faint">{formatClock(notice.timestamp)}</time>
    </motion.div>
  );
}
