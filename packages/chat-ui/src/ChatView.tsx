import {
  DEFAULT_LOCALE,
  type ChatMessage,
  type ChatNotice,
  type ChatTheme,
  type ChatUser,
  type Locale,
  type MessageFragment,
} from '@chatto/core';
import { useId, useMemo, type CSSProperties } from 'react';
import { eventTitle, noticeText } from './eventText';
import { eventKeyOf } from './events';
import type { FeedItem } from './feed';
import { scopeCustomCss, themeToCss } from './themeCss';

export interface ChatViewProps {
  theme: ChatTheme;
  items: FeedItem[];
  className?: string;
  /** Plays the theme's exit animation on every row (alert cards whose time is up). */
  leaving?: boolean;
  /**
   * URL of a file in Chatto's asset folder (frame images). Pages served by the
   * local server can leave it out; the control panel points it at the server.
   */
  assetUrl?: (file: string) => string;
  /** Language of event texts (the chat language); defaults to Traditional Chinese. */
  locale?: Locale;
}

/**
 * Renders a chat feed through the shared base. The theme only supplies
 * parameters (turned into CSS by {@link themeToCss}) and optional custom CSS.
 * Every part carries a stable `chatto-*` class; see docs/theming.md.
 */
export function ChatView({ theme, items, className, leaving, assetUrl, locale = DEFAULT_LOCALE }: ChatViewProps) {
  const id = useId();
  const scope = `.chatto-root[data-chatto-id="${id}"]`;
  const css = useMemo(
    () => [themeToCss(theme, scope, { assetUrl }), scopeCustomCss(theme.customCss, scope)].filter(Boolean).join('\n'),
    [theme, scope, assetUrl],
  );
  const ordered = theme.list.direction === 'top-down' ? [...items].reverse() : items;

  return (
    <div
      className={['chatto-root', className].filter(Boolean).join(' ')}
      data-chatto-id={id}
      data-theme-id={theme.id}
      data-base={theme.base}
      data-arrangement={theme.message.arrangement}
      data-direction={theme.list.direction}
      data-leaving={leaving || undefined}
    >
      {css ? <style>{css}</style> : null}
      <ol className="chatto-list">
        {ordered.map((item) =>
          item.kind === 'message' ? (
            <MessageRow key={item.key} message={item.message} theme={theme} locale={locale} />
          ) : (
            <NoticeRow key={item.key} notice={item.notice} theme={theme} locale={locale} />
          ),
        )}
      </ol>
    </div>
  );
}

interface RowProps {
  theme: ChatTheme;
  locale: Locale;
}

function MessageRow({ message, theme, locale }: RowProps & { message: ChatMessage }) {
  const roles = message.author.roles.join(' ');
  const event = eventKeyOf(message);
  const title = eventTitle(message, locale, theme);
  return (
    <li
      className="chatto-message"
      data-platform={message.platform}
      data-event={event}
      data-roles={roles || undefined}
      data-action={message.isAction || undefined}
      data-highlight={message.highlights.join(' ') || undefined}
      data-user={message.author.login}
    >
      {theme.avatar.show ? <Avatar user={message.author} /> : null}
      <div className="chatto-content">
        {title ? <div className="chatto-event-title">{title}</div> : null}
        {message.reply ? (
          <div className="chatto-reply">
            ↪ @{message.reply.parentAuthor.displayName}: {message.reply.parentText}
          </div>
        ) : null}
        <div className="chatto-header">
          {theme.timestamp.show ? (
            <time className="chatto-time">{formatTime(message.timestamp, theme.timestamp.hour12)}</time>
          ) : null}
          {theme.badges.show && message.author.badges.length > 0 ? <Badges user={message.author} /> : null}
          <span
            className="chatto-author"
            style={
              message.author.color ? ({ '--chatto-user-color': message.author.color } as CSSProperties) : undefined
            }
          >
            {message.author.displayName}
          </span>
          <span className="chatto-separator" aria-hidden="true" />
        </div>
        <div className="chatto-body">
          <Fragments fragments={message.fragments} />
        </div>
      </div>
    </li>
  );
}

function NoticeRow({ notice, theme, locale }: RowProps & { notice: ChatNotice }) {
  return (
    <li
      className="chatto-notice"
      data-kind={notice.kind}
      data-platform={notice.platform}
      data-event={eventKeyOf(notice)}
    >
      <div className="chatto-notice-system">{noticeText(notice, locale, theme)}</div>
      {notice.fragments.length > 0 ? (
        <div className="chatto-body">
          {notice.author && theme.badges.show ? <Badges user={notice.author} /> : null}
          <Fragments fragments={notice.fragments} />
        </div>
      ) : null}
    </li>
  );
}

function Avatar({ user }: { user: ChatUser }) {
  return (
    <span
      className="chatto-avatar"
      style={{ backgroundColor: user.color ?? 'var(--chatto-accent)' }}
      aria-hidden="true"
    >
      {user.avatar ? <img src={user.avatar} alt="" /> : user.displayName.slice(0, 1).toUpperCase()}
    </span>
  );
}

function Badges({ user }: { user: ChatUser }) {
  return (
    <span className="chatto-badges">
      {user.badges.map((badge) =>
        badge.image ? (
          <img
            key={badge.id}
            className="chatto-badge"
            data-badge={badge.setId}
            src={badge.image.x1}
            srcSet={[badge.image.x2 && `${badge.image.x2} 2x`, badge.image.x4 && `${badge.image.x4} 4x`]
              .filter(Boolean)
              .join(', ')}
            alt={badge.title}
            title={badge.title}
          />
        ) : null,
      )}
    </span>
  );
}

function Fragments({ fragments }: { fragments: MessageFragment[] }) {
  return (
    <>
      {fragments.map((fragment, index) => {
        switch (fragment.type) {
          case 'text':
            return <span key={index}>{fragment.text}</span>;
          case 'emote':
            return (
              <img
                key={index}
                className="chatto-emote"
                data-source={fragment.emote.source}
                data-zero-width={fragment.emote.zeroWidth || undefined}
                src={fragment.emote.image.x2 ?? fragment.emote.image.x1}
                alt={fragment.emote.name}
                title={fragment.emote.name}
              />
            );
          case 'mention':
            return (
              <span key={index} className="chatto-mention">
                {fragment.text}
              </span>
            );
          case 'cheer':
            return (
              <span key={index} className="chatto-cheer" data-tier={fragment.tier}>
                {fragment.image ? <img src={fragment.image.x1} alt="" /> : null}
                {fragment.prefix}
                {fragment.amount}
              </span>
            );
          case 'link':
            return (
              <span key={index} className="chatto-link">
                {fragment.text}
              </span>
            );
          case 'media':
            return <img key={index} className="chatto-media" src={fragment.url} alt={fragment.text} />;
        }
      })}
    </>
  );
}

function formatTime(timestamp: number, hour12: boolean): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12 });
}
