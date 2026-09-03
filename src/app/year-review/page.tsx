import Link from "next/link";
import { getYearReviewData } from "@/db/queries";
import { Nav } from "@/components/Nav";
import { Card } from "@/components/ui";
import { AddYearReviewCategoryForm, AddYearReviewItemForm } from "./YearReviewForms";
import { YearReviewItemRow } from "./YearReviewItemRow";
import { DeleteCategoryButton } from "./DeleteCategoryButton";
import { jewelFor } from "@/lib/jewels";
import { Sparkle } from "@/components/Sparkle";

export const dynamic = "force-dynamic";

export default async function YearReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const selectedYear = yearParam ? Number(yearParam) : undefined;
  const { years, year, categoriesWithItems, allPeople, allPlaces } =
    await getYearReviewData(selectedYear);

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

        {categoriesWithItems.length > 0 && (
          <Card>
            <h2 className="mb-3 font-medium">Totals for {year}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              {categoriesWithItems.map(({ category, items }, i) => (
                <div key={category.id}>
                  <p className="flex items-center gap-1.5 text-neutral-500">
                    <Sparkle className="h-3 w-3" color={jewelFor(i).color} />
                    {category.name}
                  </p>
                  <p className="text-2xl font-semibold" style={{ color: jewelFor(i).color }}>
                    {items.length}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card>
          <h2 className="mb-3 font-medium">Add category</h2>
          <AddYearReviewCategoryForm />
        </Card>

        {categoriesWithItems.length === 0 ? (
          <p className="text-sm text-neutral-500">No categories yet — add one above.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {categoriesWithItems.map(({ category, items }, i) => {
              const jewel = jewelFor(i);
              return (
                <details
                  key={category.id}
                  open
                  className="rounded-lg border border-neutral-800 bg-neutral-900 p-5"
                >
                  <summary className="mb-2 flex cursor-pointer items-center gap-2 font-medium">
                    <Sparkle className="h-3.5 w-3.5" color={jewel.color} />
                    {category.name}
                  </summary>

                  <AddYearReviewItemForm
                    categoryId={category.id}
                    people={allPeople}
                    places={allPlaces}
                  />

                  {items.length === 0 ? (
                    <p className="mt-3 text-sm text-neutral-500">
                      Nothing logged for {year} yet.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {items.map((item) => (
                        <YearReviewItemRow
                          key={item.id}
                          item={item}
                          jewel={jewel}
                          allPeople={allPeople}
                          allPlaces={allPlaces}
                        />
                      ))}
                    </ul>
                  )}

                  <DeleteCategoryButton categoryId={category.id} categoryName={category.name} />
                </details>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
