"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function getCookieKey(dogId: string): string {
  return `pawdojo-skipped-${dogId.slice(0, 8)}`;
}

export async function skipLesson(lessonId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("active_dog_id")
    .eq("id", user.id)
    .single();

  const dogId = profile?.active_dog_id;
  if (!dogId) return { error: "No active dog" };

  const cookieStore = await cookies();
  const key = getCookieKey(dogId);
  const existing = cookieStore.get(key)?.value ?? "";
  const skipped = existing ? existing.split(",") : [];

  if (!skipped.includes(lessonId)) {
    skipped.push(lessonId);
  }

  cookieStore.set(key, skipped.join(","), {
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function getSkippedLessons(dogId: string): Promise<Set<string>> {
  const cookieStore = await cookies();
  const key = getCookieKey(dogId);
  const value = cookieStore.get(key)?.value ?? "";
  return new Set(value ? value.split(",") : []);
}
