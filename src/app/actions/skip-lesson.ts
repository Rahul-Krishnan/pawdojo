"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const COOKIE_KEY = "pawdojo-skipped-lessons";

export async function skipLesson(lessonId: string) {
  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE_KEY)?.value ?? "";
  const skipped = existing ? existing.split(",") : [];

  if (!skipped.includes(lessonId)) {
    skipped.push(lessonId);
  }

  cookieStore.set(COOKIE_KEY, skipped.join(","), {
    maxAge: 60 * 60 * 24 * 7, // 7 days, then skipped lessons come back
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function getSkippedLessons(): Promise<Set<string>> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_KEY)?.value ?? "";
  return new Set(value ? value.split(",") : []);
}
