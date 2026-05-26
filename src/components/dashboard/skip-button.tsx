"use client";

import { useState } from "react";
import { skipLesson } from "@/app/actions/skip-lesson";
import { useRouter } from "next/navigation";
import { playTap } from "@/lib/sounds";

export function SkipButton({ lessonId }: { lessonId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSkip() {
    setLoading(true);
    playTap();
    await skipLesson(lessonId);
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={handleSkip}
      disabled={loading}
      className="text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 disabled:opacity-50 transition-colors"
    >
      {loading ? "Skipping..." : "Skip this lesson"}
    </button>
  );
}
