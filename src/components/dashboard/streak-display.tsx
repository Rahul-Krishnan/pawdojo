"use client";

import Image from "next/image";
import { SnowflakeIcon } from "@/components/icons";

export function StreakDisplay({
  currentStreak,
  freezeAvailable,
}: {
  currentStreak: number;
  freezeAvailable: number;
}) {
  return (
    <div className="flex-1 rounded-2xl bg-surface-elevated dark:bg-dark-elevated border border-gray-100 dark:border-dark-border p-4">
      <div className="flex items-center gap-2">
        <Image src="/images/focus.svg" alt="" width={32} height={32} className="dark:brightness-90" />
        <span className="text-3xl font-bold font-heading text-gray-900 dark:text-gray-50">
          {currentStreak}
        </span>
      </div>
      <p className="mt-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
        day focus
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
