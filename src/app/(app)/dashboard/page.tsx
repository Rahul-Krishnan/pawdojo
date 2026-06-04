import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StreakDisplay } from "@/components/dashboard/streak-display";
import { XpDisplay } from "@/components/dashboard/xp-display";
import { TodayLessonCard } from "@/components/dashboard/today-lesson-card";
import Image from "next/image";
import { CheckIcon, LockIcon, StarIcon } from "@/components/icons";
import { RecentSessions } from "@/components/dashboard/recent-sessions";
import { DogSwitcher } from "@/components/dashboard/dog-switcher";
import { SkipButton } from "@/components/dashboard/skip-button";
import { getSkippedLessons } from "@/app/actions/skip-lesson";
import { effectiveCurrentStreak } from "@/lib/gamification/streaks";

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
  const [{ data: completions }, { data: sessionRatings }, { data: recentSessions }, { data: dogStreakRows }] = await Promise.all([
    supabase.from("lesson_completions").select("lesson_id").eq("dog_id", dog.id),
    supabase.from("training_sessions").select("skill_id, rating, logged_at").eq("dog_id", dog.id).not("skill_id", "is", null).not("rating", "is", null).order("logged_at", { ascending: false }),
    supabase.from("training_sessions").select("id, skill_id, rating, reps, duration_min, notes, logged_at, skills(name)").eq("dog_id", dog.id).not("skill_id", "is", null).order("logged_at", { ascending: false }).limit(5),
    supabase.from("dog_streaks").select("*").eq("dog_id", dog.id).limit(1),
  ]);
  const dogStreak = dogStreakRows?.[0] ?? null;

  // The stored streak is only recomputed when a session is logged, so compute
  // the streak as it should appear right now (a missed day reads as 0).
  const currentStreak = dogStreak
    ? effectiveCurrentStreak(
        {
          currentStreak: dogStreak.current_streak,
          longestStreak: dogStreak.longest_streak,
          lastStreakDate: dogStreak.last_streak_date,
          freezeAvailable: dogStreak.freeze_available,
        },
        new Date(),
        profile?.timezone ?? "UTC"
      )
    : 0;

  const completedLessonIds = new Set(
    completions?.map((completion) => completion.lesson_id) ?? []
  );

  const skippedLessonIds = await getSkippedLessons(dog.id);

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
          currentStreak={currentStreak}
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
            Awards
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
                    <Image src="/images/award.svg" alt="" width={40} height={40} className="mx-auto" />
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

      <RecentSessions
        dogId={dog.id}
        sessions={(recentSessions ?? []).map((session) => {
          const lessonForSkill = (lessons ?? []).find((lesson) => lesson.skill_id === session.skill_id);
          return {
            id: session.id,
            skillName: lessonForSkill?.title ?? (session.skills as unknown as { name: string })?.name ?? "Training",
            rating: session.rating ?? 0,
            reps: session.reps ?? null,
            durationMin: session.duration_min ?? null,
            notes: session.notes ?? null,
            loggedAt: session.logged_at,
            href: lessonForSkill ? `/lesson/${lessonForSkill.id}` : undefined,
          };
        })}
      />

    </div>
  );
}
