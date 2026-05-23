import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckIcon, RepeatIcon, StarIcon } from "@/components/icons";

export default async function PracticePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: sessions } = await supabase
    .from("training_sessions")
    .select("skill_id, rating, logged_at, skills(name, key)")
    .eq("user_id", user.id)
    .not("skill_id", "is", null)
    .gte("logged_at", sevenDaysAgo.toISOString())
    .order("logged_at", { ascending: false });

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
      <h1 className="mb-5 text-2xl font-bold font-heading text-gray-900">Practice</h1>

      {practiceSkills.length === 0 ? (
        <div className="rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200/50 p-8 text-center">
          <CheckIcon size={40} className="mx-auto text-primary-500" />
          <p className="mt-3 text-lg font-bold font-heading text-gray-900">
            All good!
          </p>
          <p className="mt-1 text-sm text-gray-500">
            No skills need extra practice right now.
          </p>
          <Link
            href="/dashboard"
            className="mt-5 inline-block rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-primary-600/25 hover:bg-primary-700 transition-all"
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
                className="flex items-center justify-between rounded-2xl border border-accent-200 bg-gradient-to-r from-accent-50 to-accent-100/50 p-4"
              >
                <div>
                  <p className="font-semibold text-gray-800">{data.name}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      Avg
                      <span className="font-semibold text-accent-600">{avg.toFixed(1)}</span>
                      /5
                    </span>
                    <span className="flex items-center gap-0.5">
                      Last:
                      {Array.from({ length: 5 }).map((_, i) => (
                        <StarIcon
                          key={i}
                          size={10}
                          className={i < data.lastRating ? "text-accent-400" : "text-gray-200"}
                        />
                      ))}
                    </span>
                  </div>
                </div>
                <RepeatIcon size={22} className="text-accent-500" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
