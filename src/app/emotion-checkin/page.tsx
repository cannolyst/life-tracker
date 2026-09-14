import { getTodaysEmotionEntries, getEmotionCheckinPoints } from "@/db/queries";
import { requireUserId } from "@/lib/session";
import { Nav } from "@/components/Nav";
import { EmotionCheckIn } from "./EmotionCheckIn";

export const dynamic = "force-dynamic";

export default async function EmotionCheckInPage() {
  const userId = await requireUserId();
  const [entries, pointsPerCheckIn] = await Promise.all([
    getTodaysEmotionEntries(userId),
    getEmotionCheckinPoints(userId),
  ]);

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
        <h1 className="text-xl font-semibold">Emotion Check-In</h1>
        <EmotionCheckIn initialEntries={entries} pointsPerCheckIn={pointsPerCheckIn} />
      </main>
    </div>
  );
}
