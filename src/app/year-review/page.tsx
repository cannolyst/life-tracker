import Link from "next/link";
import { getYearReviewData } from "@/db/queries";
import { Nav } from "@/components/Nav";
import { Card, formatDate } from "@/components/ui";
import { AddYearReviewCategoryForm, AddYearReviewItemForm } from "./YearReviewForms";
import { deleteYearReviewCategory, deleteYearReviewItem } from "./actions";
import { jewelFor } from "@/lib/jewels";

export const dynamic = "force-dynamic";

export default async function YearReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const selectedYear = yearParam ? Number(yearParam) : undefined;
  const { years, year, categoriesWithItems } = await getYearReviewData(selectedYear);

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">Year in review</h1>
          <div className="flex gap-2">
            {years.map((y) => (
              <Link
                key={y}
                href={`/year-review?year=${y}`}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  y === year
                    ? "bg-neutral-100 text-neutral-900"
                    : "text-neutral-400 hover:text-neutral-100"
                }`}
              >
                {y}
              </Link>
            ))}
          </div>
        </div>

        {categoriesWithItems.length === 0 ? (
          <p className="text-sm text-neutral-500">No categories yet — add one below.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {categoriesWithItems.map(({ category, items }, i) => {
              const jewel = jewelFor(i);
              return (
                <Card key={category.id}>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 font-medium">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: jewel.color }}
                      />
                      {category.name}
                    </h3>
                    <form action={deleteYearReviewCategory.bind(null, category.id)}>
                      <button
                        type="submit"
                        aria-label="Delete category"
                        className="text-neutral-600 hover:text-red-400"
                      >
                        ✕
                      </button>
                    </form>
                  </div>

                  {items.length === 0 ? (
                    <p className="mb-3 text-sm text-neutral-500">
                      Nothing logged for {year} yet.
                    </p>
                  ) : (
                    <ul className="mb-3 space-y-1">
                      {items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <span>
                            {item.text}{" "}
                            <span className="text-neutral-500">· {formatDate(item.date)}</span>
                          </span>
                          <form action={deleteYearReviewItem.bind(null, item.id)}>
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
                  )}

                  <AddYearReviewItemForm categoryId={category.id} />
                </Card>
              );
            })}
          </div>
        )}

        <Card>
          <h2 className="mb-3 font-medium">Add category</h2>
          <AddYearReviewCategoryForm />
        </Card>
      </main>
    </div>
  );
}
