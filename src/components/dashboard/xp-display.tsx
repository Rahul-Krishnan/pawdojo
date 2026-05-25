"use client";

import { getBelt, getNextBelt, xpForLevel } from "@/lib/gamification/xp";

export function XpDisplay({
  totalXp,
  currentLevel,
}: {
  totalXp: number;
  currentLevel: number;
}) {
  const belt = getBelt(currentLevel);
  const nextBelt = getNextBelt(currentLevel);

  // Progress toward next belt
  const currentBeltXp = xpForLevel(belt.minLevel);
  const nextBeltXp = nextBelt ? xpForLevel(nextBelt.minLevel) : currentBeltXp;
  const progressPercent = nextBelt
    ? Math.min(((totalXp - currentBeltXp) / (nextBeltXp - currentBeltXp)) * 100, 100)
    : 100;

  return (
    <div className="flex-1 rounded-2xl bg-surface-elevated dark:bg-dark-elevated border border-gray-100 dark:border-dark-border p-4">
      <div className="flex items-center gap-2.5">
        <div className={`h-7 w-7 rounded-full ${belt.color} border-2 border-gray-300/50 dark:border-gray-600/50 shrink-0`} />
        <div className="min-w-0">
          <p className="text-sm font-bold font-heading text-gray-900 dark:text-gray-50 truncate">
            {belt.name}
          </p>
        </div>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-gray-200/60 dark:bg-gray-700/40">
        <div
          className={`h-full rounded-full ${belt.color} transition-all duration-700 ease-out`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between">
        <p className="text-[10px] text-gray-400">{totalXp} XP</p>
        {nextBelt && (
          <p className="text-[10px] text-gray-400">{nextBelt.name} at {nextBeltXp} XP</p>
        )}
      </div>
    </div>
  );
}
