import Link from "next/link";
import { getWorkoutProgramsWithDays } from "@/db/queries";
import { requireUserId } from "@/lib/session";
import { getUserSettings } from "@/db/userSettings";
import { Board, W } from "@/components/Board";
import { Nav } from "@/components/Nav";
import { Card } from "@/components/ui";
import { ProgramRow } from "./ProgramRow";
import { ProgramPresetPicker } from "./ProgramPresetPicker";

export const dynamic = "force-dynamic";

export default async function ProgramsPage() {
  const userId = await requireUserId();
  const [programsWithDays, settings] = await Promise.all([getWorkoutProgramsWithDays(userId), getUserSettings(userId)]);

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="board-page mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Manage programs</h1>
          <Link href="/exercise" className="tap text-sm text-neutral-500 hover:text-neutral-100">
            Back to Exercise
          </Link>
        </div>

        <Board pageId="programs" columnCount={3} saved={settings.layouts.programs}>
          {programsWithDays.map(({ program, days }) => (
            <W key={program.id} id={`program-${program.id}`} label={program.name}>
              <ProgramRow program={program} days={days} />
            </W>
          ))}
          <W id="new-program" label="New program" col={2}>
            <Card>
              <ProgramPresetPicker redirectTo="/exercise/programs" heading="New program" />
            </Card>
          </W>
        </Board>
      </main>
    </div>
  );
}
