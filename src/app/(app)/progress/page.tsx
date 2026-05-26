import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BoltIcon, TrophyIcon, LockIcon, CheckIcon, ChevronRightIcon, StarIcon } from "@/components/icons";
import { getBelt } from "@/lib/gamification/xp";
import { SkillRadar } from "@/components/practice/skill-radar";
import { BeltStatCard } from "@/components/dashboard/belt-stat-card";
import { FocusStatCard } from "@/components/dashboard/focus-stat-card";

export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch profile to get active_dog_id, plus dog-independent data
  const [
    { data: profile },
    { data: streak },
    { data: skills },
    { data: lessons },
    { data: achievements },
    { data: allAchievementDefs },
    { data: firstDog },
  ] = await Promise.all([
    supabase.from("user_profiles").select("*").eq("id", user.id).single(),
    supabase.from("user_streaks").select("*").eq("user_id", user.id).single(),
    supabase.from("skills").select("*").order("sort_order"),
    supabase.from("lessons").select("id, skill_id, path_order, title").order("path_order"),
    supabase.from("user_achievements").select("*, achievement_definitions(*)").eq("user_id", user.id),
    supabase.from("achievement_definitions").select("*").order("sort_order"),
    supabase.from("dogs").select("id").eq("user_id", user.id).order("created_at").limit(1),
  ]);

  const activeDogId = profile?.active_dog_id ?? firstDog?.[0]?.id;

  // Fetch dog-scoped data
  const dogFilter = activeDogId ? { key: "dog_id" as const, val: activeDogId } : { key: "user_id" as const, val: user.id };
  const [{ data: completions }, { count: totalSessions }, { data: sessionRatings }] = await Promise.all([
    supabase.from("lesson_completions").select("lesson_id").eq(dogFilter.key, dogFilter.val),
    supabase.from("training_sessions").select("id", { count: "exact" }).eq(dogFilter.key, dogFilter.val),
    supabase.from("training_sessions").select("skill_id, rating").eq(dogFilter.key, dogFilter.val).not("skill_id", "is", null).not("rating", "is", null),
  ]);

  const completedIds = new Set(completions?.map((c) => c.lesson_id) ?? []);

  // Build avg rating per skill
  const ratingsBySkill = new Map<string, number[]>();
  for (const session of sessionRatings ?? []) {
    if (!session.skill_id || !session.rating) continue;
    const arr = ratingsBySkill.get(session.skill_id);
    if (arr) arr.push(session.rating);
    else ratingsBySkill.set(session.skill_id, [session.rating]);
  }

  const skillProgress = (skills ?? []).map((skill) => {
    const skillLessons = (lessons ?? []).filter(
      (lesson) => lesson.skill_id === skill.id
    );
    const done = skillLessons.filter((lesson) =>
      completedIds.has(lesson.id)
    ).length;
    const ratings = ratingsBySkill.get(skill.id) ?? [];
    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : null;
    const completionPct = skillLessons.length > 0 ? done / skillLessons.length : 0;
    const ratingPct = avgRating !== null ? avgRating / 5 : 0;
    const radarScore = ratings.length > 0
      ? completionPct * 0.5 + ratingPct * 0.5
      : completionPct * 0.5;
    return { ...skill, total: skillLessons.length, done, lessons: skillLessons, avgRating, radarScore };
  });

  const overallScore = skillProgress.length > 0
    ? skillProgress.reduce((sum, s) => sum + s.radarScore, 0) / skillProgress.length
    : 0;

  const unlockedIds = new Set(
    achievements?.filter((a) => a.unlocked_at).map((a) => a.achievement_def_id) ?? []
  );

  const simpleStats = [
    { label: "Total XP", value: String(profile?.total_xp ?? 0), Icon: BoltIcon, color: "text-xp" },
    { label: "Sessions", value: String(totalSessions ?? 0), Icon: CheckIcon, color: "text-success-600" },
  ];

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-5 text-2xl font-bold font-heading text-gray-900 dark:text-gray-50">Progress</h1>

      {/* Radar chart */}
      <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-surface-elevated dark:bg-dark-elevated p-4 mb-6">
        <div className="text-center mb-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Overall Score
          </p>
          <p className="text-3xl font-bold font-heading text-success-600 dark:text-success-400">
            {Math.round(overallScore * 100)}%
          </p>
        </div>
        <SkillRadar
          skills={skillProgress.map((s) => ({ name: s.name, score: s.radarScore }))}
        />
        <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 mt-1">
          Dashed line = perfect score
        </p>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        {simpleStats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl bg-surface-elevated dark:bg-dark-elevated border border-gray-100 dark:border-dark-border p-4"
          >
            <div className="flex items-center gap-2">
              <stat.Icon size={18} className={stat.color} />
              <span className="text-2xl font-bold font-heading text-gray-900 dark:text-gray-50">
                {stat.value}
              </span>
            </div>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {stat.label}
            </p>
          </div>
        ))}
        <BeltStatCard
          currentLevel={profile?.current_level ?? 1}
          totalXp={profile?.total_xp ?? 0}
        />
        <FocusStatCard
          currentStreak={streak?.current_streak ?? 0}
          longestStreak={streak?.longest_streak ?? 0}
          freezeAvailable={streak?.freeze_available ?? 0}
        />
      </div>

      {/* Skills */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
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
                    ? "border-success-200 dark:border-success-800/40 bg-success-50/50 dark:bg-success-950/20"
                    : "border-gray-100 dark:border-dark-border bg-surface-elevated dark:bg-dark-elevated"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isComplete && <CheckIcon size={16} className="text-success-600" />}
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{skill.name}</p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {skill.avgRating !== null && (
                      <div className="flex items-center gap-1">
                        <StarIcon size={12} className="text-accent-400" />
                        <span className="text-xs font-semibold text-accent-600 dark:text-accent-400">
                          {skill.avgRating.toFixed(1)}
                        </span>
                      </div>
                    )}
                    <p className="text-xs font-medium text-gray-400">
                      {skill.done}/{skill.total}
                    </p>
                  </div>
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-gray-200/60 dark:bg-gray-700/40">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      isComplete
                        ? "bg-success-600"
                        : "bg-gradient-to-r from-success-500 to-success-600"
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
                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-dark-muted active:bg-gray-200 dark:active:bg-dark-border group"
                      >
                        <CheckIcon
                          size={14}
                          className={isDone ? "text-success-600 shrink-0" : "text-gray-300 dark:text-gray-600 shrink-0"}
                        />
                        <span className={`flex-1 ${isDone ? "text-gray-600 dark:text-gray-400" : "text-gray-800 dark:text-gray-200 font-medium"}`}>
                          {lesson.title}
                        </span>
                        <ChevronRightIcon size={14} className="text-gray-300 dark:text-gray-600 shrink-0 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Honors */}
      <section className="pb-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Honors
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
