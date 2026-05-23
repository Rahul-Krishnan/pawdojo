"use client";

export function StreakDisplay({
  currentStreak,
  freezeAvailable,
}: {
  currentStreak: number;
  freezeAvailable: number;
}) {
  return (
    <div className="flex-1 rounded-xl bg-orange-50 p-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🔥</span>
        <span className="text-2xl font-bold text-orange-600">
          {currentStreak}
        </span>
      </div>
      <p className="mt-1 text-xs text-orange-500">
        day streak
        {freezeAvailable > 0 && ` · ${freezeAvailable} freeze${freezeAvailable > 1 ? "s" : ""}`}
      </p>
    </div>
  );
}
