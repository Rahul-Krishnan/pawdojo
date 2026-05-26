"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function deleteDog(dogId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Verify the user owns this dog
  const { data: userDogs } = await supabase
    .from("dogs")
    .select("id")
    .eq("user_id", user.id);

  if (!userDogs || userDogs.length === 0) {
    return { error: "No dogs found" };
  }

  // Don't allow deleting the last dog
  if (userDogs.length <= 1) {
    return { error: "You can't delete your only dog" };
  }

  // Verify this dog belongs to the user
  if (!userDogs.some((dog) => dog.id === dogId)) {
    return { error: "Dog not found" };
  }

  const admin = createAdminClient();

  // If deleting the active dog, switch to another one first
  const { data: profile } = await admin
    .from("user_profiles")
    .select("active_dog_id")
    .eq("id", user.id)
    .single();

  if (profile?.active_dog_id === dogId) {
    const otherDog = userDogs.find((dog) => dog.id !== dogId);
    if (otherDog) {
      await admin
        .from("user_profiles")
        .update({ active_dog_id: otherDog.id, updated_at: new Date().toISOString() })
        .eq("id", user.id);
    }
  }

  // Delete the dog (cascades to dog_skill_progress, lesson_completions, training_sessions via FK)
  const { error } = await admin
    .from("dogs")
    .delete()
    .eq("id", dogId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to delete dog:", error.message);
    return { error: "Failed to delete. Please try again." };
  }

  revalidatePath("/", "layout");

  return { success: true };
}
