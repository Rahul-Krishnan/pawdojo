"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function switchDog(dogId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Verify the user owns this dog
  const { data: dog } = await supabase
    .from("dogs")
    .select("id")
    .eq("id", dogId)
    .eq("user_id", user.id)
    .single();

  if (!dog) {
    return { error: "Dog not found" };
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("user_profiles")
    .update({ active_dog_id: dogId, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    console.error("Failed to switch dog:", error.message);
    return { error: "Failed to switch. Please try again." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/progress");
  revalidatePath("/profile");

  return { success: true };
}
