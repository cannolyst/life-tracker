import { getListsData } from "@/db/queries";
import { Nav } from "@/components/Nav";
import { Card } from "@/components/ui";
import { AddListCategoryForm, AddListItemForm } from "./ListsForms";
import { deleteListCategory, setListItemDone, deleteListItem } from "./actions";
import { jewelFor } from "@/lib/jewels";
import { Sparkle } from "@/components/Sparkle";

export const dynamic = "force-dynamic";

export default async function ListsPage() {
  const { categoriesWithItems } = await getListsData();

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
        <h1 className="text-xl font-semibold">Lists</h1>

        {categoriesWithItems.length === 0 ? (
          <p className="text-sm text-neutral-500">No lists yet — add one below.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {categoriesWithItems.map(({ category, items }, i) => {
              const jewel = jewelFor(i);
              const active = items.filter((it) => !it.done);
              const done = items.filter((it) => it.done);
              return (
                <Card key={category.id}>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 font-medium">
                      <Sparkle className="h-3.5 w-3.5" color={jewel.color} />
                      {category.name}
                    </h3>
                    <form action={deleteListCategory.bind(null, category.id)}>
                      <button
                        type="submit"
                        aria-label="Delete list"
                        className="text-neutral-600 hover:text-red-400"
                      >
                        ✕
                      </button>
                    </form>
                  </div>

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
                </Card>
              );
            })}
          </div>
        )}

        <Card>
          <h2 className="mb-3 font-medium">Add list</h2>
          <AddListCategoryForm />
        </Card>
      </main>
    </div>
  );
}
