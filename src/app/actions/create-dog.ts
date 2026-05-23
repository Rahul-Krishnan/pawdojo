"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export async function createDog(formData: {
  name: string;
  breed: string | null;
  ageMonths: number | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const admin = createAdminClient();

  const { error } = await admin.from("dogs").insert({
    user_id: user.id,
    name: formData.name,
    breed: formData.breed,
    age_months: formData.ageMonths,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}
