"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateDogInput } from "@/lib/validation/dog";
import { revalidatePath } from "next/cache";

export async function updateDog(formData: {
  dogId: string;
  name: string;
  breed: string | null;
  birthday: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const validationError = validateDogInput(formData);
  if (validationError) {
    return { error: validationError };
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("dogs")
    .update({
      name: formData.name.trim(),
      breed: formData.breed?.trim() || null,
      birthday: formData.birthday || null,
    })
    .eq("id", formData.dogId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to update dog:", error.message);
    return { error: "Failed to update. Please try again." };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function updateTimezone(timezone: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("user_profiles")
    .update({
      timezone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("Failed to update timezone:", error.message);
    return { error: "Failed to update. Please try again." };
  }

  revalidatePath("/profile");

  return { success: true };
}
