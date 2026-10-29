// How a page's cards are arranged on wide screens. A layout is the card ids in
// each column, top to bottom, plus the ids the user has hidden. Everything here
// is pure so it can be tested; the Board component and the save action use it.

export type SavedLayout = { columns: string[][]; hidden: string[] };

export type WidgetDef = {
  id: string;
  /** Column it starts in (0-based). */
  defaultColumn: number;
  /** Position among the cards that start in the same column. */
  defaultOrder: number;
};

export const MAX_COLUMNS = 4;
const MAX_ID_LENGTH = 40;
const MAX_WIDGETS = 60;

function unique(ids: string[]): string[] {
  return [...new Set(ids)];
}

// The arrangement to show: the saved one, cleaned of cards that no longer
// exist, with any new cards slotted into their default place.
export function resolveLayout(defs: WidgetDef[], saved: SavedLayout | undefined, columnCount: number): SavedLayout {
  const known = new Map(defs.map((d) => [d.id, d]));
  const columns: string[][] = Array.from({ length: columnCount }, () => []);
  const placed = new Set<string>();

  const hidden = unique((saved?.hidden ?? []).filter((id) => known.has(id)));
  hidden.forEach((id) => placed.add(id));

  (saved?.columns ?? []).forEach((ids, i) => {
    const target = Math.min(i, columnCount - 1);
    for (const id of ids) {
      if (known.has(id) && !placed.has(id)) {
        columns[target].push(id);
        placed.add(id);
      }
    }
  });

  // Cards the saved layout has never seen go where they start by default.
  const fresh = defs.filter((d) => !placed.has(d.id)).sort((a, b) => a.defaultOrder - b.defaultOrder);
  for (const def of fresh) {
    const col = Math.max(0, Math.min(def.defaultColumn, columnCount - 1));
    const before = columns[col].filter((id) => (known.get(id)?.defaultOrder ?? 0) < def.defaultOrder).length;
    columns[col].splice(before, 0, def.id);
  }
  return { columns, hidden };
}

function without(layout: SavedLayout, id: string): SavedLayout {
  return { columns: layout.columns.map((c) => c.filter((x) => x !== id)), hidden: layout.hidden.filter((x) => x !== id) };
}

// Puts a card into a column at a position (used by drag and drop).
export function placeWidget(layout: SavedLayout, id: string, column: number, index: number): SavedLayout {
  const next = without(layout, id);
  const col = Math.max(0, Math.min(column, next.columns.length - 1));
  const at = Math.max(0, Math.min(index, next.columns[col].length));
  next.columns[col].splice(at, 0, id);
  return next;
}

export type Direction = "up" | "down" | "left" | "right";

// One step of the arrow buttons.
export function moveWidget(layout: SavedLayout, id: string, direction: Direction): SavedLayout {
  const col = layout.columns.findIndex((c) => c.includes(id));
  if (col < 0) return layout;
  const index = layout.columns[col].indexOf(id);
  if (direction === "up") return index === 0 ? layout : placeWidget(layout, id, col, index - 1);
  if (direction === "down") {
    return index === layout.columns[col].length - 1 ? layout : placeWidget(layout, id, col, index + 1);
  }
  const target = direction === "left" ? col - 1 : col + 1;
  if (target < 0 || target >= layout.columns.length) return layout;
  return placeWidget(layout, id, target, index);
}

export function hideWidget(layout: SavedLayout, id: string): SavedLayout {
  const next = without(layout, id);
  return { columns: next.columns, hidden: [...next.hidden, id] };
}

// Brings a hidden card back at the bottom of the given column.
export function showWidget(layout: SavedLayout, id: string, column: number): SavedLayout {
  const next = without(layout, id);
  const col = Math.max(0, Math.min(column, next.columns.length - 1));
  next.columns[col].push(id);
  return next;
}

// What the server will accept from the browser: a bounded, well-formed layout, or null.
export function sanitizeLayout(raw: unknown): SavedLayout | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { columns?: unknown; hidden?: unknown };
  if (!Array.isArray(r.columns) || r.columns.length < 1 || r.columns.length > MAX_COLUMNS) return null;
  const ok = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= MAX_ID_LENGTH;
  const columns: string[][] = [];
  let total = 0;
  for (const col of r.columns) {
    if (!Array.isArray(col)) return null;
    const ids = col.filter(ok);
    total += ids.length;
    columns.push(unique(ids));
  }
  const hidden = Array.isArray(r.hidden) ? unique(r.hidden.filter(ok)) : [];
  if (total + hidden.length > MAX_WIDGETS) return null;
  return { columns, hidden };
}
