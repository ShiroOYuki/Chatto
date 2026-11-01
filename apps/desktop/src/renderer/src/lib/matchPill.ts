/** Placement of the "N matches" pill over the theme editor preview. */

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Gap between the pill and the preview edge, px (Tailwind `2`). */
const PILL_INSET = 8;

/**
 * Whether the pill should move from the bottom-right corner to the top-right
 * so it does not cover a highlighted element. `matches` are in the scrolled
 * content's coordinates; `scrollTop`, the viewport and the pill size are the preview's.
 */
export function pillAtTop(
  matches: Box[],
  scrollTop: number,
  viewport: { w: number; h: number },
  pill: { w: number; h: number },
): boolean {
  const slot = (y: number): Box => ({ x: viewport.w - PILL_INSET - pill.w, y, w: pill.w, h: pill.h });
  const visible = matches.map((box) => ({ ...box, y: box.y - scrollTop }));
  const covered = (area: Box) => visible.filter((box) => overlaps(box, area)).length;
  const bottom = covered(slot(viewport.h - PILL_INSET - pill.h));
  return bottom > 0 && covered(slot(PILL_INSET)) < bottom;
}
