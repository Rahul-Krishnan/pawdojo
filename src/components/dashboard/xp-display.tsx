"use client";

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
    <div className="flex-1 rounded-xl bg-blue-50 p-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">⚡</span>
        <span className="text-2xl font-bold text-blue-600">Lv {currentLevel}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-200">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-blue-500">{totalXp} XP total</p>
    </div>
  );
}
