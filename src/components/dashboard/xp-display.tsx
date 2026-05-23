"use client";

import { BoltIcon } from "@/components/icons";

function getXpForLevel(level: number): number {
  return level * level * 100;
}

export function XpDisplay({
  totalXp,
  currentLevel,
}: {
  totalXp: number;
  currentLevel: number;
}) {
  const currentLevelXp = getXpForLevel(currentLevel);
  const nextLevelXp = getXpForLevel(currentLevel + 1);
  const progressInLevel = totalXp - currentLevelXp;
  const xpNeededForNext = nextLevelXp - currentLevelXp;
  const progressPercent = Math.min(
    (progressInLevel / xpNeededForNext) * 100,
    100
  );

  return (
    <div className="flex-1 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/30 p-4 border border-blue-100/50 dark:border-blue-900/30">
      <div className="flex items-center gap-2">
        <BoltIcon size={28} className="text-xp" />
        <span className="text-3xl font-bold font-heading text-gray-900 dark:text-gray-50">
          {currentLevel}
        </span>
      </div>
      <p className="mt-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">level</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-blue-200/60 dark:bg-blue-800/40">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-gray-400">{totalXp} XP</p>
    </div>
  );
}
