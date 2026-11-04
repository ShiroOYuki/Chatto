import { eventKeyOf } from '@chatto/chat-ui';
import { AFTER_SILENCE, type ChatEvent } from '@chatto/core';

/**
 * Which specimen rows the editor preview keeps when it shows only the current section:
 * plain chat messages, every platform event, messages after a quiet spell, or one event by key.
 */
export type SpecimenFocus = 'messages' | 'events' | 'attention' | `event:${string}`;

/** Whether a specimen event is one of the rows `focus` keeps. */
export function matchesFocus(event: ChatEvent, focus: SpecimenFocus): boolean {
  const item = event.type === 'message' ? event.message : event.type === 'notice' ? event.notice : undefined;
  if (!item) return false;
  const key = eventKeyOf(item);
  switch (focus) {
    case 'messages':
      return event.type === 'message' && key === undefined;
    case 'events':
      return event.type === 'notice' || key !== undefined;
    case 'attention':
      return event.type === 'message' && event.message.highlights.includes(AFTER_SILENCE);
    default:
      return key === focus.slice('event:'.length);
  }
}
