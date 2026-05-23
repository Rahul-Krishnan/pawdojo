import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: streak } = await supabase
    .from("user_streaks")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const { data: skills } = await supabase
    .from("skills")
    .select("*")
    .order("sort_order");

  const { data: completions } = await supabase
    .from("lesson_completions")
    .select("lesson_id")
    .eq("user_id", user.id);

  const completedIds = new Set(completions?.map((c) => c.lesson_id) ?? []);

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, skill_id, path_order")
    .order("path_order");

  const { data: achievements } = await supabase
    .from("user_achievements")
    .select("*, achievement_definitions(*)")
    .eq("user_id", user.id);

  const { data: allAchievementDefs } = await supabase
    .from("achievement_definitions")
    .select("*")
    .order("sort_order");

  // Compute per-skill progress
  const skillProgress = (skills ?? []).map((skill) => {
    const skillLessons = (lessons ?? []).filter(
      (lesson) => lesson.skill_id === skill.id
    );
    const done = skillLessons.filter((lesson) =>
      completedIds.has(lesson.id)
    ).length;
    return { ...skill, total: skillLessons.length, done };
  });

  const unlockedIds = new Set(
    achievements?.filter((a) => a.unlocked_at).map((a) => a.achievement_def_id) ?? []
  );

  const totalSessions =
    (
      await supabase
        .from("training_sessions")
        .select("id", { count: "exact" })
        .eq("user_id", user.id)
    ).count ?? 0;

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-6 text-2xl font-bold">Progress</h1>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-gray-50 p-4 text-center">
          <p className="text-2xl font-bold">{profile?.total_xp ?? 0}</p>
          <p className="text-xs text-gray-500">Total XP</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-4 text-center">
          <p className="text-2xl font-bold">Lv {profile?.current_level ?? 1}</p>
          <p className="text-xs text-gray-500">Level</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-4 text-center">
          <p className="text-2xl font-bold">{streak?.longest_streak ?? 0}</p>
          <p className="text-xs text-gray-500">Longest Streak</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-4 text-center">
          <p className="text-2xl font-bold">{totalSessions}</p>
          <p className="text-xs text-gray-500">Sessions</p>
        </div>
      </div>

      {/* Skill Tree */}
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Skills</h2>
        <div className="space-y-3">
          {skillProgress.map((skill) => {
            const percent =
              skill.total > 0 ? (skill.done / skill.total) * 100 : 0;
            return (
              <div key={skill.id} className="rounded-xl bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{skill.name}</p>
                  <p className="text-sm text-gray-500">
                    {skill.done}/{skill.total}
                  </p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Badges */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Badges</h2>
        <div className="grid grid-cols-3 gap-3">
          {(allAchievementDefs ?? []).map((def) => {
            const isUnlocked = unlockedIds.has(def.id);
            return (
              <div
                key={def.id}
                className={`rounded-xl p-3 text-center ${
                  isUnlocked ? "bg-yellow-50" : "bg-gray-100 opacity-50"
                }`}
              >
                <p className="text-2xl">{isUnlocked ? "🏆" : "🔒"}</p>
                <p className="mt-1 text-xs font-medium">{def.name}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
