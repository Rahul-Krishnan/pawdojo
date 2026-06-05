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
  isRetake?: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!formData.lessonId || !formData.skillId) {
    return { error: "Missing lesson or skill" };
  }

  const { data: lessonCheck } = await supabase
    .from("lessons")
    .select("id, skill_id")
    .eq("id", formData.lessonId)
    .single();

  if (!lessonCheck) {
    return { error: "Lesson not found" };
  }
  if (lessonCheck.skill_id !== formData.skillId) {
    return { error: "Lesson does not belong to this skill" };
  }
  if (typeof formData.rating !== "number" || formData.rating < 1 || formData.rating > 5) {
    return { error: "Rating must be between 1 and 5" };
  }
  if (formData.reps !== null && (typeof formData.reps !== "number" || formData.reps < 0)) {
    return { error: "Invalid reps value" };
  }
  if (formData.durationMin !== null && (typeof formData.durationMin !== "number" || formData.durationMin < 0)) {
    return { error: "Invalid duration value" };
  }
  if (formData.notes && formData.notes.length > 1000) {
    return { error: "Notes too long (max 1000 characters)" };
  }

  const { data: profileData } = await supabase
    .from("user_profiles")
    .select("active_dog_id")
    .eq("id", user.id)
    .single();

  let dogId = profileData?.active_dog_id;

  if (!dogId) {
    const { data: firstDog } = await supabase
      .from("dogs")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at")
      .limit(1)
      .single();
    dogId = firstDog?.id;
  }

  if (!dogId) {
    return { error: "No dog found" };
  }

  const dog = { id: dogId };

  const admin = createAdminClient();

  // Create training session (always, even on retake)
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
    console.error("Failed to create training session:", sessionError.message);
    return { error: "Failed to log session. Please try again." };
  }

  // Only create lesson completion on first time (not retake)
  // Use upsert with unique constraint to prevent duplicates from double-submits
  if (!formData.isRetake) {
    await admin.from("lesson_completions").upsert({
      user_id: user.id,
      dog_id: dog.id,
      lesson_id: formData.lessonId,
      score: formData.rating / 5,
      xp_awarded: 0,
    }, { onConflict: "dog_id,lesson_id", ignoreDuplicates: true });
  }

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
        lessons_done: formData.isRetake
          ? existingProgress.lessons_done
          : existingProgress.lessons_done + 1,
        last_practiced_at: new Date().toISOString(),
      })
      .eq("id", existingProgress.id);
  } else {
    await admin.from("dog_skill_progress").insert({
      user_id: user.id,
      dog_id: dog.id,
      skill_id: formData.skillId,
      lessons_done: formData.isRetake ? 0 : 1,
      last_practiced_at: new Date().toISOString(),
    });
  }

  const pipelineResult = await runGamificationPipeline({
    userId: user.id,
    dogId: dog.id,
    sessionId: session.id,
    lessonId: formData.isRetake ? null : formData.lessonId,
    skillId: formData.skillId,
    rating: formData.rating,
  });

  revalidatePath("/dashboard");
  revalidatePath("/progress");
  revalidatePath("/practice");

  return {
    success: true,
    xpAwarded: pipelineResult.xpAwarded,
    achievementsUnlocked: pipelineResult.achievementsUnlocked,
    streakUpdated: pipelineResult.streakUpdated,
  };
}
