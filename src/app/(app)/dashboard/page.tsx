import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StreakDisplay } from "@/components/dashboard/streak-display";
import { XpDisplay } from "@/components/dashboard/xp-display";
import { TodayLessonCard } from "@/components/dashboard/today-lesson-card";
import { StarIcon, CheckIcon, PawIcon, TrophyIcon, LockIcon } from "@/components/icons";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    { data: profile },
    { data: dog },
    { data: streak },
    { data: completions },
    { data: lessons },
    { data: recentSessions },
    { data: achievements },
    { data: allAchievementDefs },
  ] = await Promise.all([
    supabase.from("user_profiles").select("*").eq("id", user.id).single(),
    supabase.from("dogs").select("*").eq("user_id", user.id).single(),
    supabase.from("user_streaks").select("*").eq("user_id", user.id).single(),
    supabase.from("lesson_completions").select("lesson_id").eq("user_id", user.id),
    supabase.from("lessons").select("*, skills(name, key)").order("path_order", { ascending: true }),
    supabase.from("training_sessions").select("*, skills(name)").eq("user_id", user.id).order("logged_at", { ascending: false }).limit(5),
    supabase.from("user_achievements").select("achievement_def_id, unlocked_at").eq("user_id", user.id),
    supabase.from("achievement_definitions").select("*").order("sort_order"),
  ]);

  if (!dog) {
    redirect("/onboarding");
  }

  const completedLessonIds = new Set(
    completions?.map((completion) => completion.lesson_id) ?? []
  );

  const nextLesson = lessons?.find(
    (lesson) => !completedLessonIds.has(lesson.id)
  );

  const unlockedIds = new Set(
    achievements?.filter((a) => a.unlocked_at).map((a) => a.achievement_def_id) ?? []
  );

  return (
    <div className="px-4 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400">
            Welcome back
          </p>
          <h1 className="text-2xl font-bold font-heading text-gray-900 dark:text-gray-50">
            {dog.name}
          </h1>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/40">
          <PawIcon size={20} className="text-primary-600 dark:text-primary-400" />
        </div>
      </header>

      <div className="mb-5 flex gap-3">
        <StreakDisplay
          currentStreak={streak?.current_streak ?? 0}
          freezeAvailable={streak?.freeze_available ?? 0}
        />
        <XpDisplay
          totalXp={profile?.total_xp ?? 0}
          currentLevel={profile?.current_level ?? 1}
        />
      </div>

      {nextLesson && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Today&apos;s Lesson
          </h2>
          <TodayLessonCard
            lessonId={nextLesson.id}
            title={nextLesson.title}
            skillName={(nextLesson.skills as { name: string })?.name ?? ""}
          />
        </section>
      )}

      {!nextLesson && (
        <div className="rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/20 p-6 text-center border border-primary-200/50 dark:border-primary-700/30">
          <CheckIcon size={32} className="mx-auto text-primary-600 dark:text-primary-400" />
          <p className="mt-2 text-lg font-bold font-heading text-gray-900 dark:text-gray-50">
            All lessons complete!
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Keep logging sessions to maintain your streak.
          </p>
        </div>
      )}

      {(allAchievementDefs ?? []).length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Badges
          </h2>
          <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
            {(allAchievementDefs ?? []).map((def) => {
              const isUnlocked = unlockedIds.has(def.id);
              return (
                <div
                  key={def.id}
                  className={`shrink-0 w-28 rounded-2xl p-3 border text-center transition-all ${
                    isUnlocked
                      ? "border-accent-200 dark:border-accent-700/40 bg-gradient-to-br from-accent-50 to-accent-100 dark:from-accent-900/30 dark:to-accent-800/20"
                      : "border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-elevated opacity-40"
                  }`}
                >
                  {isUnlocked ? (
                    <TrophyIcon size={24} className="mx-auto text-accent-500" />
                  ) : (
                    <LockIcon size={24} className="mx-auto text-gray-300 dark:text-gray-600" />
                  )}
                  <p className="mt-1.5 text-[10px] font-semibold text-gray-700 dark:text-gray-300 leading-tight line-clamp-2">
                    {def.name}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {completedLessonIds.size > 0 && (
        <section className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              Completed Lessons
            </h2>
            <Link
              href="/progress"
              className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 transition-colors"
            >
              View All
            </Link>
          </div>
          <div className="space-y-2">
            {lessons
              ?.filter((lesson) => completedLessonIds.has(lesson.id))
              .slice(0, 4)
              .map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/lesson/${lesson.id}`}
                  className="flex items-center justify-between rounded-xl bg-white dark:bg-dark-elevated border border-gray-100 dark:border-dark-border px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-dark-muted"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckIcon size={16} className="text-primary-500 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        {lesson.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(lesson.skills as unknown as { name: string })?.name}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-accent-500">Practice</span>
                </Link>
              ))}
          </div>
        </section>
      )}

      {recentSessions && recentSessions.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Recent Activity
          </h2>
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-xl bg-white dark:bg-dark-elevated border border-gray-100 dark:border-dark-border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {(session.skills as unknown as { name: string })?.name ?? "Training"}
                  </p>
                  <div className="mt-0.5 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <StarIcon
                        key={i}
                        size={12}
                        className={i < (session.rating ?? 0) ? "text-accent-400" : "text-gray-200 dark:text-gray-600"}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(session.logged_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
