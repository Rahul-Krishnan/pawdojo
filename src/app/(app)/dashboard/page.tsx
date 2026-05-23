import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StreakDisplay } from "@/components/dashboard/streak-display";
import { XpDisplay } from "@/components/dashboard/xp-display";
import { TodayLessonCard } from "@/components/dashboard/today-lesson-card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Fetch user's dog
  const { data: dog } = await supabase
    .from("dogs")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!dog) {
    redirect("/onboarding");
  }

  // Fetch streak
  const { data: streak } = await supabase
    .from("user_streaks")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Fetch completed lesson IDs
  const { data: completions } = await supabase
    .from("lesson_completions")
    .select("lesson_id")
    .eq("user_id", user.id);

  const completedLessonIds = new Set(
    completions?.map((completion) => completion.lesson_id) ?? []
  );

  // Fetch all lessons ordered by path_order
  const { data: lessons } = await supabase
    .from("lessons")
    .select("*, skills(name, key)")
    .order("path_order", { ascending: true });

  // Find the next incomplete lesson
  const nextLesson = lessons?.find(
    (lesson) => !completedLessonIds.has(lesson.id)
  );

  // Recent sessions
  const { data: recentSessions } = await supabase
    .from("training_sessions")
    .select("*, skills(name)")
    .eq("user_id", user.id)
    .order("logged_at", { ascending: false })
    .limit(5);

  return (
    <div className="px-4 pt-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Hi, {dog.name}!</h1>
        <p className="text-sm text-gray-500">Let&apos;s keep training.</p>
      </header>

      <div className="mb-6 flex gap-4">
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
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
          <p className="text-lg font-semibold text-green-800">
            All lessons complete!
          </p>
          <p className="mt-1 text-sm text-green-600">
            Keep logging training sessions to maintain your streak.
          </p>
        </div>
      )}

      {recentSessions && recentSessions.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">Recent Activity</h2>
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {(session.skills as { name: string })?.name ?? "Training"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Rating: {"⭐".repeat(session.rating ?? 0)}
                  </p>
                </div>
                <p className="text-xs text-gray-400">
                  {new Date(session.logged_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
