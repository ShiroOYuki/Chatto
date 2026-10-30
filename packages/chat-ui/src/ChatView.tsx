import type { ChatMessage, ChatNotice, ChatTheme, ChatUser, MessageFragment } from '@chatto/core';
import { useMemo, type CSSProperties } from 'react';
import type { FeedItem } from './feed';
import { themeToCssVariables } from './themes';

export interface ChatViewProps {
  theme: ChatTheme;
  items: FeedItem[];
  className?: string;
}

/**
 * Renders a chat feed with a theme. Every part carries a stable `chatto-*`
 * class so user CSS can target it; see docs/theming.md.
 */
export function ChatView({ theme, items, className }: ChatViewProps) {
  const style = useMemo(() => themeToCssVariables(theme) as CSSProperties, [theme]);
  const ordered = theme.options.direction === 'top-down' ? [...items].reverse() : items;

  return (
    <div
      className={['chatto-root', className].filter(Boolean).join(' ')}
      data-layout={theme.layout}
      data-direction={theme.options.direction}
      data-animation={theme.options.enterAnimation}
      style={style}
    >
      {theme.customCss ? <style>{scopeCss(theme.customCss)}</style> : null}
      <ol className="chatto-list">
        {ordered.map((item) =>
          item.kind === 'message' ? (
            <MessageRow key={item.key} message={item.message} theme={theme} />
          ) : (
            <NoticeRow key={item.key} notice={item.notice} theme={theme} />
          ),
        )}
      </ol>
    </div>
  );
}

/** Prefixes custom CSS with `.chatto-root` unless the author already did. */
function scopeCss(css: string): string {
  return css.includes('.chatto-root') ? css : `@scope (.chatto-root) {\n${css}\n}`;
}

function MessageRow({ message, theme }: { message: ChatMessage; theme: ChatTheme }) {
  const { options } = theme;
  const roles = message.author.roles.join(' ');
  return (
    <li
      className="chatto-message"
      data-platform={message.platform}
      data-roles={roles}
      data-action={message.isAction || undefined}
      data-highlight={message.highlights.join(' ') || undefined}
      data-user={message.author.login}
    >
      {options.showAvatars ? <Avatar user={message.author} /> : null}
      <div className="chatto-content">
        <div className="chatto-header">
          {options.showTimestamps ? <time className="chatto-time">{formatTime(message.timestamp)}</time> : null}
          {options.showBadges && message.author.badges.length > 0 ? <Badges user={message.author} /> : null}
          <span
            className="chatto-author"
            style={options.useUserColors && message.author.color ? { color: message.author.color } : undefined}
          >
            {message.author.displayName}
          </span>
          <span className="chatto-separator" aria-hidden="true" />
        </div>
        {message.reply ? (
          <div className="chatto-reply">
            ↪ @{message.reply.parentAuthor.displayName}: {message.reply.parentText}
          </div>
        ) : null}
        <div className="chatto-body">
          <Fragments fragments={message.fragments} />
        </div>
      </div>
    </li>
  );
}

function NoticeRow({ notice, theme }: { notice: ChatNotice; theme: ChatTheme }) {
  return (
    <li className="chatto-notice" data-kind={notice.kind} data-platform={notice.platform}>
      <div className="chatto-notice-system">{notice.systemText}</div>
      {notice.fragments.length > 0 ? (
        <div className="chatto-body">
          {notice.author && theme.options.showBadges ? <Badges user={notice.author} /> : null}
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

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}
