import { useState } from 'react';
import { buildSelector, scopesFor, type InspectedElement, type SelectorScope } from '../../lib/cssSelector';

export interface PreviewHighlight {
  /** Selector to outline in the preview, or null for none. */
  highlight: string | null;
  inspect: boolean;
  toggleInspect: () => void;
  picked: InspectedElement | null;
  pickedScopes: SelectorScope[];
  pickedScope: number;
  pickedSelector: string | null;
  pick: (info: InspectedElement) => void;
  selectScope: (index: number) => void;
  clearPick: () => void;
  setHoverSelector: (selector: string | null) => void;
  setCursorSelector: (selector: string | null) => void;
  /** Mouse handlers that outline `selector` while hovered; empty when there is no selector. */
  hoverProps: (selector?: string) => { onMouseEnter?: () => void; onMouseLeave?: () => void };
}

/**
 * Tracks everything that can outline elements in the editor preview.
 * Only explicit pointing highlights (hover, inspect pick, CSS cursor);
 * simply opening a section does not, so the styling stays easy to judge.
 */
export function usePreviewHighlight(cssSectionActive: boolean): PreviewHighlight {
  const [inspect, setInspect] = useState(false);
  const [picked, setPicked] = useState<InspectedElement | null>(null);
  const [pickedScope, setPickedScope] = useState(0);
  /** Selector previewed while hovering a chip or a builder option. */
  const [hoverSelector, setHoverSelector] = useState<string | null>(null);
  /** Selector of the CSS rule the editor cursor is in. */
  const [cursorSelector, setCursorSelector] = useState<string | null>(null);

  const pickedScopes = picked ? scopesFor(picked) : [];
  const pickedSelector = picked ? buildSelector(picked, pickedScopes[pickedScope] ?? { kind: 'all' }) : null;
  const highlight = hoverSelector ?? pickedSelector ?? (cssSectionActive ? cursorSelector : null);

  return {
    highlight,
    inspect,
    toggleInspect: () => {
      setInspect((value) => !value);
      setPicked(null);
    },
    picked,
    pickedScopes,
    pickedScope,
    pickedSelector,
    pick: (info) => {
      setPicked(info);
      setPickedScope(0);
    },
    selectScope: setPickedScope,
    clearPick: () => {
      setPicked(null);
      setHoverSelector(null);
    },
    setHoverSelector,
    setCursorSelector,
    hoverProps: (selector) =>
      selector ? { onMouseEnter: () => setHoverSelector(selector), onMouseLeave: () => setHoverSelector(null) } : {},
  };
}
