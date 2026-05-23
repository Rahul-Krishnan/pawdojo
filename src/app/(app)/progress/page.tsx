import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BoltIcon, FlameIcon, StarIcon, TrophyIcon, LockIcon, CheckIcon } from "@/components/icons";

export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: streak },
    { data: skills },
    { data: completions },
    { data: lessons },
    { data: achievements },
    { data: allAchievementDefs },
    { count: totalSessions },
  ] = await Promise.all([
    supabase.from("user_profiles").select("*").eq("id", user.id).single(),
    supabase.from("user_streaks").select("*").eq("user_id", user.id).single(),
    supabase.from("skills").select("*").order("sort_order"),
    supabase.from("lesson_completions").select("lesson_id").eq("user_id", user.id),
    supabase.from("lessons").select("id, skill_id, path_order, title").order("path_order"),
    supabase.from("user_achievements").select("*, achievement_definitions(*)").eq("user_id", user.id),
    supabase.from("achievement_definitions").select("*").order("sort_order"),
    supabase.from("training_sessions").select("id", { count: "exact" }).eq("user_id", user.id),
  ]);

  const completedIds = new Set(completions?.map((c) => c.lesson_id) ?? []);

  const skillProgress = (skills ?? []).map((skill) => {
    const skillLessons = (lessons ?? []).filter(
      (lesson) => lesson.skill_id === skill.id
    );
    const done = skillLessons.filter((lesson) =>
      completedIds.has(lesson.id)
    ).length;
    return { ...skill, total: skillLessons.length, done, lessons: skillLessons };
  });

  const unlockedIds = new Set(
    achievements?.filter((a) => a.unlocked_at).map((a) => a.achievement_def_id) ?? []
  );

  const stats = [
    { label: "Total XP", value: profile?.total_xp ?? 0, Icon: BoltIcon, color: "text-xp" },
    { label: "Level", value: profile?.current_level ?? 1, Icon: StarIcon, color: "text-accent-500" },
    { label: "Best Streak", value: streak?.longest_streak ?? 0, Icon: FlameIcon, color: "text-streak" },
    { label: "Sessions", value: totalSessions ?? 0, Icon: CheckIcon, color: "text-primary-600" },
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
                <div className="mt-3 space-y-1">
                  {skill.lessons.map((lesson: { id: string; title: string; skill_id: string; path_order: number }) => {
                    const isDone = completedIds.has(lesson.id);
                    return (
                      <Link
                        key={lesson.id}
                        href={`/lesson/${lesson.id}`}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-gray-100"
                      >
                        <CheckIcon
                          size={14}
                          className={isDone ? "text-primary-500 shrink-0" : "text-gray-200 shrink-0"}
                        />
                        <span className={isDone ? "text-gray-600" : "text-gray-800 font-medium"}>
                          {lesson.title}
                        </span>
                      </Link>
                    );
                  })}
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
        <div className="grid grid-cols-2 gap-2.5">
          {(allAchievementDefs ?? []).map((def) => {
            const isUnlocked = unlockedIds.has(def.id);
            return (
              <div
                key={def.id}
                className={`rounded-2xl p-3.5 border transition-all ${
                  isUnlocked
                    ? "border-accent-200 dark:border-accent-700/40 bg-gradient-to-br from-accent-50 to-accent-100 dark:from-accent-900/30 dark:to-accent-800/20"
                    : "border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-elevated opacity-50"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {isUnlocked ? (
                    <TrophyIcon size={22} className="mt-0.5 shrink-0 text-accent-500" />
                  ) : (
                    <LockIcon size={22} className="mt-0.5 shrink-0 text-gray-300 dark:text-gray-500" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight">
                      {def.name}
                    </p>
                    <p className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400 leading-snug">
                      {def.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
