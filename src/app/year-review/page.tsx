import Link from "next/link";
import { getYearReviewData } from "@/db/queries";
import { requireUserId } from "@/lib/session";
import { dateKeyIn } from "@/lib/timezone";
import { getUserSettings } from "@/db/userSettings";
import { getYearNumbers } from "@/db/reset";
import { getJournalYear } from "@/db/journal";
import { moodLabel } from "@/lib/journal";
import { formatDay } from "../journal/EntryView";
import { getCompletedGoals } from "@/db/goals";
import { isFeatureOn, isPartOn } from "@/lib/features";
import { BLOCK_LABELS, percent } from "@/lib/yearNumbers";
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
  const userId = await requireUserId();
  const settings = await getUserSettings(userId);
  const today = dateKeyIn(settings.timezone);
  const { years, year, categoriesWithItems, allPeople, allPlaces } =
    await getYearReviewData(userId, selectedYear);
  // The new numbers come from the home dashboard's features, so they only appear with it on.
  const dashboardOn = isFeatureOn(settings.features, "dashboard");
  const [numbers, completedGoals, journalYear] = dashboardOn
    ? await Promise.all([
        getYearNumbers(userId, year, settings.timezone),
        isPartOn(settings.features, "goals") ? getCompletedGoals(userId, year) : Promise.resolve([]),
        isPartOn(settings.features, "journal") ? getJournalYear(userId, String(year)) : Promise.resolve(null),
      ])
    : [null, [], null];

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
                className={`tap rounded-md px-3 py-1.5 text-sm font-medium ${
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

        {numbers && (
          <Card>
            <h2 className="mb-3 font-medium">Your {year} in numbers</h2>
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <p className="text-neutral-500">Tasks started</p>
                <p className="text-2xl font-semibold">{numbers.starts}</p>
              </div>
              <div>
                <p className="text-neutral-500">Tasks finished</p>
                <p className="text-2xl font-semibold">{numbers.finished}</p>
              </div>
              <div>
                <p className="text-neutral-500">Comebacks</p>
                <p className="text-2xl font-semibold">{numbers.reentries}</p>
              </div>
              <div>
                <p className="text-neutral-500">Out tonight</p>
                <p className="text-2xl font-semibold">{numbers.outNights}</p>
              </div>
              <div>
                <p className="text-neutral-500">Goals completed</p>
                <p className="text-2xl font-semibold">{completedGoals.length}</p>
              </div>
            </div>

            {completedGoals.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-neutral-500">Goals you finished</p>
                <ul className="space-y-1 text-sm">
                  {completedGoals.map((g) => (
                    <li key={g.id}>
                      <span className="mr-2 text-xs text-neutral-500">{g.completedOn}</span>
                      {g.title}
                      {g.why && <span className="block text-xs text-neutral-500">“{g.why}”</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {journalYear && journalYear.entries > 0 && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-neutral-500">
                  Journal: {journalYear.entries} {journalYear.entries === 1 ? "night" : "nights"} written,{" "}
                  {journalYear.photos} with a photo
                  {journalYear.moods.length > 0 &&
                    ` · most often ${(moodLabel(journalYear.moods[0].mood) ?? "").toLowerCase()}`}
                </p>
                {journalYear.highlights.length > 0 && (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {journalYear.highlights.map((h) => (
                      <li key={h.id}>
                        <Link href={`/journal?date=${h.date}`} className="block space-y-1">
                          {/* eslint-disable-next-line @next/next/no-img-element -- private, authenticated route; not optimizable */}
                          <img src={`/api/journal/photo/${h.id}`} alt="" loading="lazy" className="aspect-square w-full rounded-md object-cover" />
                          <span className="block text-xs text-neutral-500">{formatDay(h.date, false)}</span>
                          <span className="line-clamp-3 block text-xs text-neutral-300">{h.reflection}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {numbers.blockRates.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-neutral-500">How often each part of the day’s habits got done</p>
                <ul className="space-y-2">
                  {numbers.blockRates.map((b) => (
                    <li key={b.block} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{BLOCK_LABELS[b.block] ?? b.block}</span>
                        <span className="text-neutral-400">{percent(b.rate)}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
                        <div className="h-full rounded-full bg-neutral-500" style={{ width: percent(b.rate) }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {numbers.highlights.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-neutral-500">
                  Weekly highlights ({numbers.resets} {numbers.resets === 1 ? "reset" : "resets"} finished)
                </p>
                <ul className="space-y-1 text-sm">
                  {numbers.highlights.map((h) => (
                    <li key={h.weekKey}>
                      <span className="mr-2 text-xs text-neutral-500">Week of {h.weekKey}</span>
                      {h.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
                    today={today}
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
