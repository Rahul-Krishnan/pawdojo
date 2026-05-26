import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StreakDisplay } from "@/components/dashboard/streak-display";
import { XpDisplay } from "@/components/dashboard/xp-display";
import { TodayLessonCard } from "@/components/dashboard/today-lesson-card";
import Image from "next/image";
import { CheckIcon, TrophyIcon, LockIcon, StarIcon } from "@/components/icons";
import { DogSwitcher } from "@/components/dashboard/dog-switcher";
import { SkipButton } from "@/components/dashboard/skip-button";
import { getSkippedLessons } from "@/app/actions/skip-lesson";

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
    { data: lessons },
    { data: achievements },
    { data: allAchievementDefs },
  ] = await Promise.all([
    supabase.from("user_profiles").select("*").eq("id", user.id).single(),
    supabase.from("dogs").select("*").eq("user_id", user.id).order("created_at"),
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

  // Fetch dog-scoped data: completions, sessions, and dog streak
  const [{ data: completions }, { data: sessionRatings }, { data: recentSessions }, { data: dogStreak }] = await Promise.all([
    supabase.from("lesson_completions").select("lesson_id").eq("dog_id", dog.id),
    supabase.from("training_sessions").select("skill_id, rating, logged_at").eq("dog_id", dog.id).not("skill_id", "is", null).not("rating", "is", null).order("logged_at", { ascending: false }),
    supabase.from("training_sessions").select("id, skill_id, rating, logged_at, skills(name)").eq("dog_id", dog.id).not("skill_id", "is", null).order("logged_at", { ascending: false }).limit(5),
    supabase.from("dog_streaks").select("*").eq("dog_id", dog.id).single(),
  ]);

  const completedLessonIds = new Set(
    completions?.map((completion) => completion.lesson_id) ?? []
  );

  const skippedLessonIds = await getSkippedLessons();

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

  // Find next uncompleted lesson in the linear path, skipping skipped ones
  const nextNewLesson = (lessons ?? []).find(
    (lesson) => !completedLessonIds.has(lesson.id) && !skippedLessonIds.has(lesson.id)
  );

  // If all uncompleted lessons are skipped, show the first skipped one (they come back)
  const nextSkippedLesson = !nextNewLesson
    ? (lessons ?? []).find(
        (lesson) => !completedLessonIds.has(lesson.id) && skippedLessonIds.has(lesson.id)
      )
    : null;

  // Decision: alternate between new lessons and reviews.
  // Show a review if there's a weak skill AND the user has completed
  // at least 2 lessons since their last review would have appeared.
  // Simple heuristic: show review when completedCount is odd and there's a weak skill.
  const completedCount = completedLessonIds.size;
  const showReview = reviewLesson && completedCount > 0 && completedCount % 3 === 0;

  let nextLesson = nextNewLesson ?? nextSkippedLesson ?? null;
  let isReview = false;

  if (showReview && reviewLesson) {
    nextLesson = reviewLesson;
    isReview = true;
  } else if (!nextNewLesson && !nextSkippedLesson && reviewLesson) {
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
          currentStreak={dogStreak?.current_streak ?? 0}
          longestStreak={dogStreak?.longest_streak ?? 0}
          freezeAvailable={dogStreak?.freeze_available ?? 0}
        />
        <XpDisplay
          totalXp={dog.total_xp ?? 0}
          currentLevel={dog.current_level ?? 1}
        />
      </div>

      {nextLesson && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {isReview ? "Next Lesson (Review)" : "Next Lesson"}
          </h2>
          <TodayLessonCard
            lessonId={nextLesson.id}
            title={nextLesson.title}
            skillName={(nextLesson.skills as { name: string })?.name ?? ""}
          />
          <div className="mt-3 flex items-center justify-center gap-4">
            {isReview && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Low scores in this skill
              </p>
            )}
            <SkipButton lessonId={nextLesson.id} />
          </div>
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
            {[...(allAchievementDefs ?? [])].sort((a, b) => {
              const aUnlocked = unlockedIds.has(a.id) ? 0 : 1;
              const bUnlocked = unlockedIds.has(b.id) ? 0 : 1;
              return aUnlocked - bUnlocked;
            }).map((def) => {
              const isUnlocked = unlockedIds.has(def.id);
              return (
                <div
                  key={def.id}
                  className={`shrink-0 w-36 rounded-2xl p-3 border text-center transition-all ${
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
                  <p className="mt-0.5 text-[9px] text-gray-400 dark:text-gray-500 leading-snug line-clamp-2">
                    {def.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {recentSessions && recentSessions.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Recent Sessions
          </h2>
          <div className="space-y-2">
            {recentSessions.map((session) => {
              const lessonForSkill = (lessons ?? []).find((lesson) => lesson.skill_id === session.skill_id);
              const lessonTitle = lessonForSkill?.title ?? (session.skills as unknown as { name: string })?.name ?? "Training";
              return (
                <Link
                  key={session.id}
                  href={lessonForSkill ? `/lesson/${lessonForSkill.id}` : "/progress"}
                  className="flex items-center justify-between rounded-xl bg-surface-elevated dark:bg-dark-elevated border border-gray-100 dark:border-dark-border px-4 py-3 transition-colors hover:bg-surface-muted dark:hover:bg-dark-muted"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {lessonTitle}
                    </p>
                    <div className="mt-0.5 flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <StarIcon
                          key={index}
                          size={12}
                          className={index < (session.rating ?? 0) ? "text-accent-400" : "text-gray-200 dark:text-gray-600"}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(session.logged_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
}
