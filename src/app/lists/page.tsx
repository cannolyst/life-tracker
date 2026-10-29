import { getListsData, getTodos } from "@/db/queries";
import { requireUserId } from "@/lib/session";
import { getUserSettings } from "@/db/userSettings";
import { isFeatureOn } from "@/lib/features";
import { Nav } from "@/components/Nav";
import { Card } from "@/components/ui";
import { Board, W } from "@/components/Board";
import { AddListCategoryForm, AddListItemForm } from "./ListsForms";
import { setListItemDone, deleteListItem } from "./actions";
import { DeleteListButton } from "./DeleteListButton";
import { ListReorderButtons } from "./ListReorderButtons";
import { ListContextSelect } from "./ListContextSelect";
import type { ListContext } from "@/lib/planning";
import { TodoSection } from "../todo/TodoSection";
import { jewelFor } from "@/lib/jewels";
import { Sparkle } from "@/components/Sparkle";

export const dynamic = "force-dynamic";

export default async function ListsPage() {
  const userId = await requireUserId();
  const [{ categoriesWithItems }, todos, settings] = await Promise.all([
    getListsData(userId),
    getTodos(userId),
    getUserSettings(userId),
  ]);
  // Collections-in-context belongs to the home dashboard; without it this page is unchanged.
  const dashboardOn = isFeatureOn(settings.features, "dashboard");

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="board-page mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
        <h1 className="text-xl font-semibold">Lists</h1>

        <Board pageId="lists" columnCount={3} saved={settings.layouts.lists}>
        <W id="todo" label="To-do" col={0}>
          <TodoSection todos={todos} />
        </W>

        <W id="add-list" label={dashboardOn ? "Collections" : "Your lists"} col={1}>
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">{dashboardOn ? "Collections" : "Your lists"}</h2>
            {dashboardOn && (
              <p className="text-sm text-neutral-500">
                Lists you keep for reference — groceries, movies, books, gift ideas. Things to do live on the Plan page.
              </p>
            )}
            <Card>
              <h3 className="mb-3 font-medium">Add list</h3>
              <AddListCategoryForm />
            </Card>
          </div>
        </W>

        {categoriesWithItems.length === 0 ? (
          <W id="no-lists" label="Lists">
            <p className="text-sm text-neutral-500">No lists yet — add one above.</p>
          </W>
        ) : (
            categoriesWithItems.map(({ category, items }, i) => {
              const jewel = jewelFor(i);
              const active = items.filter((it) => !it.done);
              const done = items.filter((it) => it.done);
              return (
                <W key={category.id} id={`list-${category.id}`} label={category.name}>
                <details
                  open
                  className="rounded-lg border border-neutral-800 bg-neutral-900 p-5"
                >
                  <summary className="mb-2 flex cursor-pointer items-center gap-2 font-medium">
                    <Sparkle className="h-3.5 w-3.5" color={jewel.color} />
                    {category.name}
                    <ListReorderButtons
                      categoryId={category.id}
                      name={category.name}
                      isFirst={i === 0}
                      isLast={i === categoriesWithItems.length - 1}
                    />
                  </summary>

                  {dashboardOn && (
                    <ListContextSelect categoryId={category.id} context={category.context as ListContext | null} />
                  )}

                  <ul className="mb-3 space-y-1">
                    {active.length === 0 && (
                      <p className="text-sm text-neutral-500">Nothing here yet.</p>
                    )}
                    {active.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                        <form action={setListItemDone.bind(null, item.id, true)} className="flex-1">
                          <button
                            type="submit"
                            className="w-full text-left text-neutral-300 hover:text-neutral-100"
                          >
                            {item.text}
                          </button>
                        </form>
                        <form action={deleteListItem.bind(null, item.id)}>
                          <button
                            type="submit"
                            aria-label="Delete item"
                            className="text-neutral-600 hover:text-red-400"
                          >
                            ✕
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>

                  {done.length > 0 && (
                    <details className="mb-3">
                      <summary className="cursor-pointer text-xs text-neutral-500">
                        {done.length} done
                      </summary>
                      <ul className="mt-2 space-y-1">
                        {done.map((item) => (
                          <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                            <form
                              action={setListItemDone.bind(null, item.id, false)}
                              className="flex-1"
                            >
                              <button
                                type="submit"
                                className="w-full text-left text-neutral-500 line-through hover:text-neutral-300"
                              >
                                {item.text}
                              </button>
                            </form>
                            <form action={deleteListItem.bind(null, item.id)}>
                              <button
                                type="submit"
                                aria-label="Delete item"
                                className="text-neutral-600 hover:text-red-400"
                              >
                                ✕
                              </button>
                            </form>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  <AddListItemForm categoryId={category.id} />

                  <DeleteListButton categoryId={category.id} categoryName={category.name} />
                </details>
                </W>
              );
            })
        )}
        </Board>
      </main>
    </div>
  );
}
