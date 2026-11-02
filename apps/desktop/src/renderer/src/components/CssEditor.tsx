import { ATTRIBUTE_REFERENCE, CLASS_REFERENCE, EVENT_REFERENCE } from '@chatto/chat-ui';
import { autocompletion, type Completion, type CompletionContext } from '@codemirror/autocomplete';
import { css, cssLanguage } from '@codemirror/lang-css';
import { EditorState } from '@codemirror/state';
import { EditorView, placeholder as placeholderText } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import type { Locale } from '@chatto/core';
import { useEffect, useMemo, useRef } from 'react';
import { useLocale } from '../i18n';
import { selectorAtCursor } from '../lib/cssSelector';

/** Chatto classes and data attributes, described in the interface language. */
const completionsFor = (locale: Locale): Completion[] => [
  ...CLASS_REFERENCE.map((item) => ({
    label: item.selector,
    type: 'class',
    detail: item.label[locale],
    info: item.description[locale],
    boost: 2,
  })),
  ...[...ATTRIBUTE_REFERENCE, ...EVENT_REFERENCE].map((item) => ({
    label: item.selector,
    type: 'property',
    detail: item.label[locale],
    info: item.description[locale],
    boost: 1,
  })),
];

/** Suggests Chatto classes and data attributes while typing selectors. */
function chattoCompletions(options: () => Completion[]) {
  return (context: CompletionContext) => {
    const word = context.matchBefore(/[.[][\w\-~="':]*$/);
    if (!word || (word.from === word.to && !context.explicit)) return null;
    // Skip declaration values (`color: …`); selectors and nested rules are fine.
    const before = context.state.doc.sliceString(0, word.from);
    const open = before.lastIndexOf('{');
    if (open > before.lastIndexOf('}')) {
      const declaration = before.slice(Math.max(open, before.lastIndexOf(';')) + 1);
      if (declaration.includes(':')) return null;
    }
    return { from: word.from, options: options(), validFor: /^[.[][\w\-~="':]*$/ };
  };
}

const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '12px',
    backgroundColor: 'var(--c-canvas)',
    color: 'var(--c-ink)',
    borderRadius: '12px',
    border: '1px solid var(--c-line)',
  },
  '&.cm-focused': { outline: 'none', borderColor: 'var(--c-matcha)' },
  '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.6' },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: 'var(--c-ink-faint)',
    border: 'none',
    borderTopLeftRadius: '12px',
    borderBottomLeftRadius: '12px',
  },
  '.cm-activeLine, .cm-activeLineGutter': {
    backgroundColor: 'color-mix(in srgb, var(--c-matcha-soft) 18%, transparent)',
  },
  '.cm-cursor': { borderLeftColor: 'var(--c-matcha)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
    backgroundColor: 'color-mix(in srgb, var(--c-matcha-soft) 45%, transparent) !important',
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--c-tile)',
    border: '1px solid var(--c-line)',
    borderRadius: '10px',
    overflow: 'hidden',
    fontFamily: 'var(--font-sans)',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--c-tile-muted)',
    color: 'var(--c-ink)',
  },
  '.cm-completionLabel': { fontFamily: 'var(--font-mono)' },
  '.cm-completionDetail': { color: 'var(--c-ink-faint)', fontStyle: 'normal', marginLeft: '0.6em' },
  '.cm-completionInfo': { padding: '6px 10px', color: 'var(--c-ink-soft)' },
});

export interface CursorRequest {
  position: number;
  /** Changes each request so the same position can be requested again. */
  nonce: number;
}

/**
 * CodeMirror 6 editor for custom CSS. Reports the selector of the rule the
 * cursor is in so the preview can highlight what it matches.
 */
export function CssEditor({
  value,
  onChange,
  onSelectorChange,
  cursorRequest,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelectorChange: (selector: string | null) => void;
  cursorRequest?: CursorRequest | null;
  placeholder?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const callbacks = useRef({ onChange, onSelectorChange });
  callbacks.current = { onChange, onSelectorChange };
  // The editor is built once; completions read the current language through this ref.
  const locale = useLocale();
  const localized = useMemo(() => completionsFor(locale), [locale]);
  const completions = useRef(localized);
  completions.current = localized;

  useEffect(() => {
    if (!host.current) return;
    const report = (state: EditorState) =>
      callbacks.current.onSelectorChange(selectorAtCursor(state.doc.toString(), state.selection.main.head));
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          css(),
          cssLanguage.data.of({ autocomplete: chattoCompletions(() => completions.current) }),
          autocompletion({ icons: false }),
          editorTheme,
          EditorView.lineWrapping,
          placeholder ? placeholderText(placeholder) : [],
          EditorView.updateListener.of((update) => {
            if (update.docChanged) callbacks.current.onChange(update.state.doc.toString());
            if (update.docChanged || update.selectionSet) report(update.state);
          }),
          EditorView.domEventHandlers({ blur: () => callbacks.current.onSelectorChange(null) }),
        ],
      }),
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
    // The editor owns its document after mount; outside changes sync below.
  }, []);

  // Outside edits (inserted rules, reset, preset load) replace the document.
  useEffect(() => {
    const editor = view.current;
    if (!editor || editor.state.doc.toString() === value) return;
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } });
  }, [value]);

  useEffect(() => {
    const editor = view.current;
    if (!editor || !cursorRequest) return;
    const position = Math.min(cursorRequest.position, editor.state.doc.length);
    editor.dispatch({ selection: { anchor: position }, scrollIntoView: true });
    editor.focus();
  }, [cursorRequest]);

  return <div ref={host} className="h-full min-h-[320px]" />;
}
