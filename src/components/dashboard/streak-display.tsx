"use client";

import { FlameIcon, SnowflakeIcon } from "@/components/icons";

export function StreakDisplay({
  currentStreak,
  freezeAvailable,
}: {
  currentStreak: number;
  freezeAvailable: number;
}) {
  return (
    <div className="flex-1 rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/40 dark:to-orange-950/30 p-4 border border-red-100/50 dark:border-red-900/30">
      <div className="flex items-center gap-2">
        <FlameIcon size={28} className="text-streak" />
        <span className="text-3xl font-bold font-heading text-gray-900 dark:text-gray-50">
          {currentStreak}
        </span>
      </div>
      <p className="mt-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
        day streak
      </p>
      {freezeAvailable > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400">
          <SnowflakeIcon size={12} />
          <span>{freezeAvailable} freeze{freezeAvailable > 1 ? "s" : ""}</span>
        </div>
      )}
    </div>
  );
}
