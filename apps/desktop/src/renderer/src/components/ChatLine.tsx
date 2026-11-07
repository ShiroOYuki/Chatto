import { noticeText } from '@chatto/chat-ui';
import type { ChatMessage, ChatNotice, MessageFragment, UserRole } from '@chatto/core';
import { ChevronRight, Gift, Megaphone, PartyPopper, Swords } from 'lucide-react';
import { memo, useState, type CSSProperties } from 'react';
import { motion } from './motion';
import { Badge } from './kit';
import { useLocale, useMessages } from '../i18n';

type LabelledRole = 'broadcaster' | 'moderator' | 'vip' | 'subscriber';
const ROLE_TONE: Record<LabelledRole, 'matcha' | 'sakura' | 'neutral'> = {
  broadcaster: 'sakura',
  moderator: 'matcha',
  vip: 'sakura',
  subscriber: 'neutral',
};
const isLabelled = (role: UserRole): role is LabelledRole => role in ROLE_TONE;

/**
 * A viewer's name color, for the `user-color` class: platform colors are picked for dark chat,
 * so `styles.css` darkens them toward the ink color in light mode to keep them readable.
 */
export function userColor(color: string | undefined): CSSProperties | undefined {
  return color ? ({ '--user-color': color } as CSSProperties) : undefined;
}

// One shared formatter: creating an Intl formatter per line is slow when the log re-renders.
const CLOCK = new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit', hour12: false });

export function formatClock(timestamp: number): string {
  return CLOCK.format(timestamp);
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
              <span key={index} className="font-medium text-matcha-strong dark:text-matcha">
                {fragment.text}
              </span>
            );
          case 'link':
            return (
              <span key={index} className="text-matcha-strong underline decoration-dotted dark:text-matcha">
                {fragment.text}
              </span>
            );
          case 'cheer':
            return (
              <span key={index} className="font-semibold text-matcha-strong dark:text-matcha">
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

/**
 * One chat message in the control panel's log (not themed — themes are for viewers).
 * Memoized: log entries keep their identity, so only new or changed lines render when a message arrives.
 */
export const ChatLine = memo(function ChatLine({
  message,
  deleted,
  showTime = true,
}: {
  message: ChatMessage;
  deleted?: boolean;
  showTime?: boolean;
}) {
  const m = useMessages().chatLog;
  const role = message.author.roles.find(isLabelled);
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
            <Badge tone={ROLE_TONE[role]}>{m.roles[role]}</Badge>
          </span>
        ) : null}
        <span
          className={`font-semibold ${message.author.color ? 'user-color' : ''}`}
          style={userColor(message.author.color)}
        >
          {message.author.displayName}
        </span>
        <span className="text-ink-faint">{m.separator}</span>
        <span className={deleted ? 'line-through' : ''}>
          <Fragments fragments={message.fragments} />
        </span>
        {deleted ? (
          <span className="ml-2 align-[1px]">
            <Badge tone="danger">{m.deleted}</Badge>
          </span>
        ) : null}
      </div>
    </motion.div>
  );
});

const NOTICE_ICON = {
  raid: Swords,
  announcement: Megaphone,
  'gift-subscription': Gift,
} as const;

/** Who a merged notice's members went to (gift recipients), falling back to their own text. */
const NO_MEMBERS: ChatNotice[] = [];

const memberLabel = (member: ChatNotice) =>
  typeof member.meta.recipient === 'string' ? member.meta.recipient : (member.author?.displayName ?? member.systemText);

export const NoticeLine = memo(function NoticeLine({
  notice,
  members = NO_MEMBERS,
}: {
  notice: ChatNotice;
  members?: ChatNotice[];
}) {
  const Icon = NOTICE_ICON[notice.kind as keyof typeof NOTICE_ICON] ?? PartyPopper;
  const [open, setOpen] = useState(false);
  const m = useMessages().chatLog;
  const locale = useLocale();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="my-1 flex gap-3 rounded-xl border border-matcha/30 bg-matcha-soft/25 px-3 py-2 text-sm"
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-matcha" />
      <div className="min-w-0">
        <div className="font-medium">{noticeText(notice, locale)}</div>
        {notice.fragments.length > 0 ? (
          <div className="text-ink-soft">
            <Fragments fragments={notice.fragments} />
          </div>
        ) : null}
        {members.length > 0 ? (
          <>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
              className="mt-0.5 inline-flex items-center gap-0.5 text-xs text-matcha-strong hover:underline dark:text-matcha"
            >
              <ChevronRight className={`size-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
              {m.recipients(members.length)}
            </button>
            {open ? (
              <ul className="mt-1 flex flex-wrap gap-1">
                {members.map((member) => (
                  <li key={member.id} className="rounded-full bg-tile px-2 py-0.5 text-xs text-ink-soft">
                    {memberLabel(member)}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
      </div>
      <time className="ml-auto shrink-0 font-mono text-[11px] text-ink-faint">{formatClock(notice.timestamp)}</time>
    </motion.div>
  );
});
