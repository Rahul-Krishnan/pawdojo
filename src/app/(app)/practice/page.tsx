import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StarIcon, ChevronRightIcon } from "@/components/icons";
import { SkillRadar } from "@/components/practice/skill-radar";

export default async function PracticePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [
    { data: skills },
    { data: lessons },
    { data: completions },
    { data: sessions },
  ] = await Promise.all([
    supabase.from("skills").select("*").order("sort_order"),
    supabase.from("lessons").select("id, skill_id").order("path_order"),
    supabase.from("lesson_completions").select("lesson_id").eq("user_id", user.id),
    supabase.from("training_sessions").select("skill_id, rating").eq("user_id", user.id).not("skill_id", "is", null).not("rating", "is", null),
  ]);

  const completedIds = new Set(completions?.map((c) => c.lesson_id) ?? []);

  // Build lessons per skill
  const lessonsBySkill = new Map<string, string[]>();
  for (const lesson of lessons ?? []) {
    const arr = lessonsBySkill.get(lesson.skill_id);
    if (arr) arr.push(lesson.id);
    else lessonsBySkill.set(lesson.skill_id, [lesson.id]);
  }

  // Build avg rating per skill
  const ratingsBySkill = new Map<string, number[]>();
  for (const s of sessions ?? []) {
    if (!s.skill_id || !s.rating) continue;
    const arr = ratingsBySkill.get(s.skill_id);
    if (arr) arr.push(s.rating);
    else ratingsBySkill.set(s.skill_id, [s.rating]);
  }

  // Composite score: 50% avg rating (normalized to 0-1) + 50% completion %
  const skillScores = (skills ?? []).map((skill) => {
    const skillLessonIds = lessonsBySkill.get(skill.id) ?? [];
    const totalLessons = skillLessonIds.length;
    const doneLessons = skillLessonIds.filter((id) => completedIds.has(id)).length;
    const completionPct = totalLessons > 0 ? doneLessons / totalLessons : 0;

    const ratings = ratingsBySkill.get(skill.id) ?? [];
    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : 0;
    const ratingPct = avgRating / 5;

    const score = ratings.length > 0
      ? completionPct * 0.5 + ratingPct * 0.5
      : completionPct * 0.5;

    return {
      id: skill.id,
      name: skill.name,
      score,
      avgRating: ratings.length > 0 ? avgRating : null,
      completionPct,
      doneLessons,
      totalLessons,
      firstLessonId: skillLessonIds[0] ?? null,
    };
  });

  const overallScore = skillScores.length > 0
    ? skillScores.reduce((sum, s) => sum + s.score, 0) / skillScores.length
    : 0;

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-5 text-2xl font-bold font-heading text-gray-900 dark:text-gray-50">Practice</h1>

      <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-surface-elevated dark:bg-dark-elevated p-4 mb-6">
        <div className="text-center mb-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Overall Score
          </p>
          <p className="text-3xl font-bold font-heading text-primary-600 dark:text-primary-400">
            {Math.round(overallScore * 100)}%
          </p>
        </div>
        <SkillRadar
          skills={skillScores.map((s) => ({ name: s.name, score: s.score }))}
        />
        <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 mt-1">
          Dashed line = perfect score
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Skills Breakdown
        </h2>
        <div className="space-y-2">
          {skillScores.map((skill) => (
            <Link
              key={skill.id}
              href={skill.firstLessonId ? `/lesson/${skill.firstLessonId}` : "/progress"}
              className="flex items-center justify-between rounded-xl bg-white dark:bg-dark-elevated border border-gray-100 dark:border-dark-border px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-dark-muted active:bg-gray-100 dark:active:bg-dark-border group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {skill.name}
                </p>
                <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {skill.doneLessons}/{skill.totalLessons} lessons
                  </span>
                  {skill.avgRating !== null && (
                    <span className="flex items-center gap-0.5">
                      <StarIcon size={10} className="text-accent-400" />
                      <span className="font-semibold text-accent-600 dark:text-accent-400">
                        {skill.avgRating.toFixed(1)}
                      </span>
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                  {Math.round(skill.score * 100)}%
                </span>
                <ChevronRightIcon size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
