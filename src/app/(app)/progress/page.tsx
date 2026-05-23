import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BoltIcon, FlameIcon, StarIcon, TrophyIcon, LockIcon, CheckIcon } from "@/components/icons";

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

  const stats = [
    { label: "Total XP", value: profile?.total_xp ?? 0, Icon: BoltIcon, color: "text-xp" },
    { label: "Level", value: profile?.current_level ?? 1, Icon: StarIcon, color: "text-accent-500" },
    { label: "Best Streak", value: streak?.longest_streak ?? 0, Icon: FlameIcon, color: "text-streak" },
    { label: "Sessions", value: totalSessions, Icon: CheckIcon, color: "text-primary-600" },
  ];

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-5 text-2xl font-bold font-heading text-gray-900">Progress</h1>

      <div className="mb-6 grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl bg-surface-elevated border border-gray-100 p-4"
          >
            <div className="flex items-center gap-2">
              <stat.Icon size={18} className={stat.color} />
              <span className="text-2xl font-bold font-heading text-gray-900">
                {stat.value}
              </span>
            </div>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400">
          Skills
        </h2>
        <div className="space-y-2.5">
          {skillProgress.map((skill) => {
            const percent =
              skill.total > 0 ? (skill.done / skill.total) * 100 : 0;
            const isComplete = skill.done >= skill.total;
            return (
              <div
                key={skill.id}
                className={`rounded-2xl border p-4 ${
                  isComplete
                    ? "border-primary-200 bg-primary-50/50"
                    : "border-gray-100 bg-surface-elevated"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isComplete && <CheckIcon size={16} className="text-primary-600" />}
                    <p className="font-semibold text-gray-800">{skill.name}</p>
                  </div>
                  <p className="text-xs font-medium text-gray-400">
                    {skill.done}/{skill.total}
                  </p>
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-gray-200/60">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      isComplete
                        ? "bg-primary-500"
                        : "bg-gradient-to-r from-primary-400 to-primary-500"
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="pb-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400">
          Badges
        </h2>
        <div className="grid grid-cols-3 gap-2.5">
          {(allAchievementDefs ?? []).map((def) => {
            const isUnlocked = unlockedIds.has(def.id);
            return (
              <div
                key={def.id}
                className={`rounded-2xl p-3 text-center border transition-all ${
                  isUnlocked
                    ? "border-accent-200 bg-gradient-to-br from-accent-50 to-accent-100"
                    : "border-gray-100 bg-gray-50 opacity-40"
                }`}
              >
                {isUnlocked ? (
                  <TrophyIcon size={28} className="mx-auto text-accent-500" />
                ) : (
                  <LockIcon size={28} className="mx-auto text-gray-300" />
                )}
                <p className="mt-1.5 text-[10px] font-semibold text-gray-600 leading-tight">
                  {def.name}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
