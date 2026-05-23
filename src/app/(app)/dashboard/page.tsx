import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StreakDisplay } from "@/components/dashboard/streak-display";
import { XpDisplay } from "@/components/dashboard/xp-display";
import { TodayLessonCard } from "@/components/dashboard/today-lesson-card";
import { StarIcon, CheckIcon, PawIcon } from "@/components/icons";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: dog } = await supabase
    .from("dogs")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!dog) {
    redirect("/onboarding");
  }

  const { data: streak } = await supabase
    .from("user_streaks")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const { data: completions } = await supabase
    .from("lesson_completions")
    .select("lesson_id")
    .eq("user_id", user.id);

  const completedLessonIds = new Set(
    completions?.map((completion) => completion.lesson_id) ?? []
  );

  const { data: lessons } = await supabase
    .from("lessons")
    .select("*, skills(name, key)")
    .order("path_order", { ascending: true });

  const nextLesson = lessons?.find(
    (lesson) => !completedLessonIds.has(lesson.id)
  );

  const { data: recentSessions } = await supabase
    .from("training_sessions")
    .select("*, skills(name)")
    .eq("user_id", user.id)
    .order("logged_at", { ascending: false })
    .limit(5);

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
        <TodayLessonCard
          lessonId={nextLesson.id}
          title={nextLesson.title}
          skillName={(nextLesson.skills as { name: string })?.name ?? ""}
          pathOrder={nextLesson.path_order}
          totalLessons={lessons?.length ?? 0}
        />
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

      {recentSessions && recentSessions.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400">
            Recent Activity
          </h2>
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-xl bg-white dark:bg-dark-elevated border border-gray-100 dark:border-dark-border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
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
                <p className="text-xs text-gray-400">
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
