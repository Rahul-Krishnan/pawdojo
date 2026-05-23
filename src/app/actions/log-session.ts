"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runGamificationPipeline } from "@/lib/gamification/pipeline";
import { revalidatePath } from "next/cache";

export async function logSession(formData: {
  lessonId: string;
  skillId: string;
  rating: number;
  reps: number | null;
  durationMin: number | null;
  notes: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get user's dog
  const { data: dog } = await supabase
    .from("dogs")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!dog) {
    return { error: "No dog found" };
  }

  const admin = createAdminClient();

  // Create training session
  const { data: session, error: sessionError } = await admin
    .from("training_sessions")
    .insert({
      user_id: user.id,
      dog_id: dog.id,
      skill_id: formData.skillId,
      rating: formData.rating,
      reps: formData.reps,
      duration_min: formData.durationMin,
      notes: formData.notes || null,
    })
    .select()
    .single();

  if (sessionError) {
    return { error: sessionError.message };
  }

  // Create lesson completion
  const { error: completionError } = await admin
    .from("lesson_completions")
    .insert({
      user_id: user.id,
      dog_id: dog.id,
      lesson_id: formData.lessonId,
      score: formData.rating / 5,
      xp_awarded: 0, // Will be set by XP handler
    });

  if (completionError) {
    return { error: completionError.message };
  }

  // Update dog skill progress
  const { data: existingProgress } = await admin
    .from("dog_skill_progress")
    .select("*")
    .eq("dog_id", dog.id)
    .eq("skill_id", formData.skillId)
    .single();

  if (existingProgress) {
    await admin
      .from("dog_skill_progress")
      .update({
        lessons_done: existingProgress.lessons_done + 1,
        last_practiced_at: new Date().toISOString(),
      })
      .eq("id", existingProgress.id);
  } else {
    await admin.from("dog_skill_progress").insert({
      user_id: user.id,
      dog_id: dog.id,
      skill_id: formData.skillId,
      lessons_done: 1,
      last_practiced_at: new Date().toISOString(),
    });
  }

  // Run gamification pipeline (streak, XP, achievements)
  const pipelineResult = await runGamificationPipeline({
    userId: user.id,
    dogId: dog.id,
    sessionId: session.id,
    lessonId: formData.lessonId,
    skillId: formData.skillId,
    rating: formData.rating,
  });

  revalidatePath("/dashboard");
  revalidatePath("/progress");

  return {
    success: true,
    xpAwarded: pipelineResult.xpAwarded,
    achievementsUnlocked: pipelineResult.achievementsUnlocked,
    streakUpdated: pipelineResult.streakUpdated,
  };
}
