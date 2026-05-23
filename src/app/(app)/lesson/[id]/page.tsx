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

  // Check if already completed
  const { data: completion } = await supabase
    .from("lesson_completions")
    .select("id")
    .eq("user_id", user.id)
    .eq("lesson_id", id)
    .limit(1);

  const isCompleted = completion && completion.length > 0;

  return (
    <div className="px-4 pt-6">
      <LessonContent
        lessonId={lesson.id}
        skillId={(lesson.skills as { id: string }).id}
        skillName={(lesson.skills as { name: string }).name}
        title={lesson.title}
        contentMd={lesson.content_md}
        xpReward={lesson.xp_reward}
        isCompleted={isCompleted ?? false}
      />
    </div>
  );
}
