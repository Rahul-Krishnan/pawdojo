import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { LessonContent } from "@/components/lesson/lesson-content";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: lesson } = await supabase
    .from("lessons")
    .select("*, skills(id, name, key)")
    .eq("id", id)
    .single();

  if (!lesson) {
    notFound();
  }

  const skillId = (lesson.skills as { id: string }).id;

  const [{ data: completion }, { data: sessions }] = await Promise.all([
    supabase
      .from("lesson_completions")
      .select("id")
      .eq("user_id", user.id)
      .eq("lesson_id", id)
      .limit(1),
    supabase
      .from("training_sessions")
      .select("id, rating, notes, logged_at, reps, duration_min")
      .eq("user_id", user.id)
      .eq("skill_id", skillId)
      .order("logged_at", { ascending: false })
      .limit(10),
  ]);

  const isCompleted = completion && completion.length > 0;

  return (
    <div className="px-4 pt-6">
      <LessonContent
        lessonId={lesson.id}
        skillId={skillId}
        skillName={(lesson.skills as { name: string }).name}
        title={lesson.title}
        contentMd={lesson.content_md}
        xpReward={lesson.xp_reward}
        isCompleted={isCompleted ?? false}
        sessions={(sessions ?? []).map((session) => ({
          id: session.id,
          rating: session.rating,
          notes: session.notes,
          loggedAt: session.logged_at,
          reps: session.reps,
          durationMin: session.duration_min,
        }))}
      />
    </div>
  );
}
