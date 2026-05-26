import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StreakDisplay } from "@/components/dashboard/streak-display";
import { XpDisplay } from "@/components/dashboard/xp-display";
import { TodayLessonCard } from "@/components/dashboard/today-lesson-card";
import Image from "next/image";
import { CheckIcon, TrophyIcon, LockIcon } from "@/components/icons";
import { DogSwitcher } from "@/components/dashboard/dog-switcher";

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
    { data: allDogs },
    { data: streak },
    { data: lessons },
    { data: achievements },
    { data: allAchievementDefs },
  ] = await Promise.all([
    supabase.from("user_profiles").select("*").eq("id", user.id).single(),
    supabase.from("dogs").select("*").eq("user_id", user.id).order("created_at"),
    supabase.from("user_streaks").select("*").eq("user_id", user.id).single(),
    supabase.from("lessons").select("*, skills(name, key)").order("path_order", { ascending: true }),
    supabase.from("user_achievements").select("achievement_def_id, unlocked_at").eq("user_id", user.id),
    supabase.from("achievement_definitions").select("*").order("sort_order"),
  ]);

  if (!allDogs || allDogs.length === 0) {
    redirect("/onboarding");
  }

  // Resolve active dog
  const activeDogId = profile?.active_dog_id ?? allDogs[0].id;
  const dog = allDogs.find((d) => d.id === activeDogId) ?? allDogs[0];

  // Fetch dog-scoped data using active dog
  const [{ data: completions }, { data: sessionRatings }] = await Promise.all([
    supabase.from("lesson_completions").select("lesson_id").eq("dog_id", dog.id),
    supabase.from("training_sessions").select("skill_id, rating, logged_at").eq("dog_id", dog.id).not("skill_id", "is", null).not("rating", "is", null).order("logged_at", { ascending: false }),
  ]);

  const completedLessonIds = new Set(
    completions?.map((completion) => completion.lesson_id) ?? []
  );

  // Build avg rating per skill from sessions
  const ratingsBySkill = new Map<string, { total: number; count: number; lastDate: string }>();
  for (const session of sessionRatings ?? []) {
    if (!session.skill_id || !session.rating) continue;
    const existing = ratingsBySkill.get(session.skill_id);
    if (existing) {
      existing.total += session.rating;
      existing.count += 1;
    } else {
      ratingsBySkill.set(session.skill_id, {
        total: session.rating,
        count: 1,
        lastDate: session.logged_at,
      });
    }
  }

  // Find weak skills: avg rating 3 or below, sorted by worst first
  const weakSkills: { skillId: string; avg: number; lastDate: string }[] = [];
  for (const [skillId, data] of ratingsBySkill) {
    const avg = data.total / data.count;
    if (avg <= 3) {
      weakSkills.push({ skillId, avg, lastDate: data.lastDate });
    }
  }
  weakSkills.sort((a, b) => a.avg - b.avg);

  // Find the weakest skill's first completed lesson (for review)
  let reviewLesson = null;
  for (const weak of weakSkills) {
    const found = (lessons ?? []).find(
      (lesson) => lesson.skill_id === weak.skillId && completedLessonIds.has(lesson.id)
    );
    if (found) {
      reviewLesson = found;
      break;
    }
  }

  // Find next uncompleted lesson in the linear path
  const nextNewLesson = (lessons ?? []).find(
    (lesson) => !completedLessonIds.has(lesson.id)
  );

  // Decision: alternate between new lessons and reviews.
  // Show a review if there's a weak skill AND the user has completed
  // at least 2 lessons since their last review would have appeared.
  // Simple heuristic: show review when completedCount is odd and there's a weak skill.
  const completedCount = completedLessonIds.size;
  const showReview = reviewLesson && completedCount > 0 && completedCount % 3 === 0;

  let nextLesson = nextNewLesson;
  let isReview = false;

  if (showReview && reviewLesson) {
    nextLesson = reviewLesson;
    isReview = true;
  } else if (!nextNewLesson && reviewLesson) {
    // All new lessons done, but weak skills remain
    nextLesson = reviewLesson;
    isReview = true;
  }

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
          <DogSwitcher
            activeDogId={dog.id}
            dogs={allDogs.map((d) => ({ id: d.id, name: d.name }))}
          />
        </div>
        <Link href="/profile">
          <Image src="/images/logo.svg" alt="Paw Dojo" width={56} height={56} />
        </Link>
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
            {isReview ? "Review Lesson" : "Next Lesson"}
          </h2>
          <TodayLessonCard
            lessonId={nextLesson.id}
            title={nextLesson.title}
            skillName={(nextLesson.skills as { name: string })?.name ?? ""}
          />
          {isReview && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
              Your scores in this skill were low. Practice to improve!
            </p>
          )}
        </section>
      )}

      {!nextLesson && (
        <div className="rounded-2xl bg-gradient-to-br from-success-50 to-success-100 dark:from-success-900/30 dark:to-success-800/20 p-6 text-center border border-success-200/50 dark:border-success-700/30">
          <CheckIcon size={32} className="mx-auto text-success-600 dark:text-success-400" />
          <p className="mt-2 text-lg font-bold font-heading text-gray-900 dark:text-gray-50">
            All caught up!
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            All lessons complete with good scores. Keep training!
          </p>
        </div>
      )}

      {(allAchievementDefs ?? []).length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Honors
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
                    <CheckIcon size={16} className="text-success-600 shrink-0" />
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

    </div>
  );
}
