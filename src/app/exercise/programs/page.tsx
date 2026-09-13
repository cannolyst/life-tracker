import Link from "next/link";
import { getWorkoutProgramsWithDays } from "@/db/queries";
import { requireUserId } from "@/lib/session";
import { Nav } from "@/components/Nav";
import { Card } from "@/components/ui";
import { ProgramRow } from "./ProgramRow";
import { ProgramPresetPicker } from "./ProgramPresetPicker";

export const dynamic = "force-dynamic";

export default async function ProgramsPage() {
  const userId = await requireUserId();
  const programsWithDays = await getWorkoutProgramsWithDays(userId);

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Manage programs</h1>
          <Link href="/exercise" className="text-sm text-neutral-500 hover:text-neutral-100">
            Back to Exercise
          </Link>
        </div>

        {programsWithDays.map(({ program, days }) => (
          <ProgramRow key={program.id} program={program} days={days} />
        ))}

        <Card>
          <ProgramPresetPicker redirectTo="/exercise/programs" heading="New program" />
        </Card>
      </main>
    </div>
  );
}
