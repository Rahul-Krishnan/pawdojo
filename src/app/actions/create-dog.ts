"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export async function createDog(formData: {
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

  if (!formData.name || formData.name.trim().length === 0) {
    return { error: "Dog name is required" };
  }
  if (formData.name.length > 50) {
    return { error: "Dog name too long (max 50 characters)" };
  }
  if (formData.breed && formData.breed.length > 100) {
    return { error: "Breed name too long" };
  }

  const admin = createAdminClient();

  const { error } = await admin.from("dogs").insert({
    user_id: user.id,
    name: formData.name.trim(),
    breed: formData.breed?.trim() || null,
    birthday: formData.birthday || null,
  });

  if (error) {
    console.error("Failed to create dog:", error.message);
    return { error: "Something went wrong. Please try again." };
  }

  redirect("/dashboard");
}
