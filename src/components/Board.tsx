"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type ReactNode,
} from "react";
import { saveLayoutAction } from "@/app/layout-actions";
import {
  hideWidget,
  moveWidget,
  placeWidget,
  resolveLayout,
  showWidget,
  type Direction,
  type SavedLayout,
  type WidgetDef,
} from "@/lib/layout";

export type BoardWidget = WidgetDef & {
  label: string;
  /** Position in the single phone column (lower is higher up). */
  mobileOrder: number;
  node: ReactNode;
};

// One card on a Board page: <W id="tomorrow" label="Tomorrow">…</W>. It only
// carries its props; Board reads them, so cards keep their phone order (the order
// they're written in) and start spread across the columns unless `col` says otherwise.
export function W(props: { id: string; label: string; col?: number; children: ReactNode }): ReactNode {
  void props;
  return null;
}

function widgetsFromChildren(children: ReactNode, columnCount: number): BoardWidget[] {
  const out: BoardWidget[] = [];
  Children.toArray(children).forEach((child, index) => {
    if (!isValidElement<{ id?: string; label?: string; col?: number; children?: ReactNode }>(child)) return;
    const { id, label, col, children: node } = child.props;
    if (typeof id !== "string") return;
    out.push({
      id,
      label: label ?? id,
      mobileOrder: index,
      defaultColumn: col ?? index % columnCount,
      defaultOrder: index,
      node,
    });
  });
  return out;
}

const iconButton =
  "min-h-8 min-w-8 rounded border border-neutral-700 bg-neutral-900 px-2 text-xs text-neutral-300 hover:text-neutral-100";

// A page's cards in columns. On a phone it is one column in `mobileOrder`. On a
// wide screen, Customize lets you drag cards between columns, nudge them with
// the arrows, or hide them; the arrangement is saved to your account.
export function Board({
  pageId,
  columnCount,
  widgets: widgetList,
  children,
  saved,
}: {
  pageId: string;
  columnCount: number;
  widgets?: BoardWidget[];
  children?: ReactNode;
  saved?: SavedLayout;
}) {
  const widgets = widgetList ?? widgetsFromChildren(children, columnCount);
  const [layout, setLayout] = useState<SavedLayout>(() => resolveLayout(widgets, saved, columnCount));
  const [editing, setEditing] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ column: number; index: number } | null>(null);
  const dirty = useRef(false);

  const byId = new Map(widgets.map((w) => [w.id, w]));
  // New cards that appear (say, a flag on a day with a bill due) join the layout in their default place.
  const current = resolveLayout(widgets, layout, columnCount);

  // Save a moment after the last change so a quick series of moves is one write.
  useEffect(() => {
    if (!dirty.current) return;
    const timer = setTimeout(() => {
      dirty.current = false;
      void saveLayoutAction(pageId, layout);
    }, 600);
    return () => clearTimeout(timer);
  }, [layout, pageId]);

  const change = (next: SavedLayout) => {
    dirty.current = true;
    setLayout(next);
  };

  const reset = () => {
    dirty.current = false;
    setLayout(resolveLayout(widgets, undefined, columnCount));
    void saveLayoutAction(pageId, null);
  };

  const columnOf = (id: string) => current.columns.findIndex((c) => c.includes(id));

  const onDragOver = (event: DragEvent<HTMLElement>, column: number) => {
    if (!dragging) return;
    event.preventDefault();
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>("[data-card]")].filter(
      (el) => el.dataset.card !== dragging && el.offsetHeight > 0,
    );
    let index = items.length;
    for (let i = 0; i < items.length; i++) {
      const box = items[i].getBoundingClientRect();
      if (event.clientY < box.top + box.height / 2) {
        index = i;
        break;
      }
    }
    setDrop((old) => (old && old.column === column && old.index === index ? old : { column, index }));
  };

  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    if (dragging && drop) change(placeWidget(current, dragging, drop.column, drop.index));
    setDragging(null);
    setDrop(null);
  };

  const move = (id: string, direction: Direction) => change(moveWidget(current, id, direction));

  const marker = (column: number, index: number) =>
    drop && drop.column === column && drop.index === index ? (
      <div aria-hidden className="h-1 rounded bg-[var(--color-accent)]" />
    ) : null;

  return (
    <div>
      <div className="mb-3 hidden items-center justify-end gap-2 xl:flex">
        {editing ? (
          <>
            <span className="mr-auto text-xs text-neutral-500">Drag a card, or use the arrows. Changes save as you go.</span>
            <button type="button" onClick={reset} className={`${iconButton} px-3`}>
              Reset layout
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="min-h-8 rounded border border-neutral-100 bg-neutral-100 px-3 text-xs font-medium text-neutral-900"
            >
              Done
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setEditing(true)} className={`${iconButton} px-3`}>
            Customize
          </button>
        )}
      </div>

      <div className="board" style={{ "--cols": columnCount } as CSSProperties}>
        {current.columns.map((ids, column) => (
          <div
            key={column}
            className={`board-col ${editing ? "board-col-editing" : ""}`}
            onDragOver={(event) => onDragOver(event, column)}
            onDrop={onDrop}
          >
            {ids.map((id, index) => {
              const widget = byId.get(id);
              if (!widget) return null;
              return (
                <div key={id} style={{ "--m": widget.mobileOrder } as CSSProperties} className="board-item">
                  {marker(column, index)}
                  <div
                    data-card={id}
                    draggable={editing}
                    onDragStart={(event) => {
                      setDragging(id);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", id);
                    }}
                    onDragEnd={() => {
                      setDragging(null);
                      setDrop(null);
                    }}
                    className={editing ? `board-editing ${dragging === id ? "opacity-40" : ""}` : undefined}
                  >
                    {editing && (
                      <div className="board-toolbar">
                        <span className="cursor-grab select-none px-1 text-xs text-neutral-400" aria-hidden>
                          ⠿ {widget.label}
                        </span>
                        <span className="flex gap-1">
                          <button type="button" aria-label={`Move ${widget.label} left`} disabled={columnOf(id) === 0} onClick={() => move(id, "left")} className={iconButton}>
                            ←
                          </button>
                          <button type="button" aria-label={`Move ${widget.label} up`} onClick={() => move(id, "up")} className={iconButton}>
                            ↑
                          </button>
                          <button type="button" aria-label={`Move ${widget.label} down`} onClick={() => move(id, "down")} className={iconButton}>
                            ↓
                          </button>
                          <button
                            type="button"
                            aria-label={`Move ${widget.label} right`}
                            disabled={columnOf(id) === columnCount - 1}
                            onClick={() => move(id, "right")}
                            className={iconButton}
                          >
                            →
                          </button>
                          <button type="button" aria-label={`Hide ${widget.label}`} onClick={() => change(hideWidget(current, id))} className={iconButton}>
                            Hide
                          </button>
                        </span>
                      </div>
                    )}
                    <div className={`board-body ${editing ? "pointer-events-none select-none" : ""}`}>{widget.node}</div>
                  </div>
                </div>
              );
            })}
            {marker(column, ids.length)}
          </div>
        ))}
      </div>

      {editing && current.hidden.length > 0 && (
        <div className="mt-4 hidden flex-wrap items-center gap-2 text-xs text-neutral-500 xl:flex">
          Hidden:
          {current.hidden.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => change(showWidget(current, id, byId.get(id)?.defaultColumn ?? 0))}
              className={`${iconButton} px-3`}
            >
              Show {byId.get(id)?.label ?? id}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
