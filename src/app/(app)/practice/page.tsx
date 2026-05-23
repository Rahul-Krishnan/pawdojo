import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function PracticePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Find skills that need practice: avg rating <= 2.5 in last 7 days,
  // excluding skills where most recent session rated >= 4
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: sessions } = await supabase
    .from("training_sessions")
    .select("skill_id, rating, logged_at, skills(name, key)")
    .eq("user_id", user.id)
    .not("skill_id", "is", null)
    .gte("logged_at", sevenDaysAgo.toISOString())
    .order("logged_at", { ascending: false });

  // Group by skill, compute avg rating and most recent rating
  const skillMap = new Map<
    string,
    { name: string; ratings: number[]; lastRating: number }
  >();

  for (const session of sessions ?? []) {
    if (!session.skill_id || !session.rating) continue;
    const existing = skillMap.get(session.skill_id);
    if (existing) {
      existing.ratings.push(session.rating);
    } else {
      skillMap.set(session.skill_id, {
        name: (session.skills as unknown as { name: string })?.name ?? "Unknown",
        ratings: [session.rating],
        lastRating: session.rating,
      });
    }
  }

  const practiceSkills = Array.from(skillMap.entries())
    .filter(([, data]) => {
      const avg =
        data.ratings.reduce((sum, rating) => sum + rating, 0) / data.ratings.length;
      return avg <= 2.5 && data.lastRating < 4;
    })
    .sort(([, a], [, b]) => {
      const avgA = a.ratings.reduce((s, r) => s + r, 0) / a.ratings.length;
      const avgB = b.ratings.reduce((s, r) => s + r, 0) / b.ratings.length;
      return avgA - avgB;
    });

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-4 text-2xl font-bold">Practice</h1>

      {practiceSkills.length === 0 ? (
        <div className="rounded-xl bg-green-50 p-6 text-center">
          <p className="text-lg font-semibold text-green-800">
            All good!
          </p>
          <p className="mt-1 text-sm text-green-600">
            No skills need extra practice right now.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Back to Dashboard
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            These skills had low ratings recently. Practice them to improve.
          </p>
          {practiceSkills.map(([skillId, data]) => {
            const avg =
              data.ratings.reduce((s, r) => s + r, 0) / data.ratings.length;
            return (
              <div
                key={skillId}
                className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 p-4"
              >
                <div>
                  <p className="font-medium text-orange-900">{data.name}</p>
                  <p className="text-xs text-orange-600">
                    Avg rating: {avg.toFixed(1)}/5 · Last: {data.lastRating}/5
                  </p>
                </div>
                <span className="text-2xl">🔄</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
