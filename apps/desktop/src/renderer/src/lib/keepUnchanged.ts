/**
 * Every app state update arrives as fresh objects (IPC copies them). For lists that memoized
 * components draw, such as theme cards, keep the previous object of each item whose content did
 * not change, and the previous array when nothing did.
 */
export function keepUnchanged<T extends { id: string }>(previous: readonly T[] | undefined, next: T[]): T[] {
  if (!previous) return next;
  const before = new Map(previous.map((item) => [item.id, item]));
  let same = previous.length === next.length;
  const kept = next.map((item, index) => {
    const old = before.get(item.id);
    const keep = old !== undefined && (old === item || JSON.stringify(old) === JSON.stringify(item));
    if (!keep || previous[index] !== old) same = false;
    return keep ? old : item;
  });
  return same ? (previous as T[]) : kept;
}
