"use client";

import { getBelt, xpForLevel, BELTS } from "@/lib/gamification/xp";
import { motion } from "motion/react";
import { CheckIcon } from "@/components/icons";

export function BeltProgressionModal({
  currentLevel,
  totalXp,
  onClose,
}: {
  currentLevel: number;
  totalXp: number;
  onClose: () => void;
}) {
  const currentBelt = getBelt(currentLevel);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-surface-elevated dark:bg-dark-elevated border border-gray-100 dark:border-dark-border p-6 pb-10 sm:pb-6 shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold font-heading text-gray-900 dark:text-gray-50">
            Belt Progression
          </h2>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            Done
          </button>
        </div>

        <div className="space-y-1">
          {BELTS.map((belt, index) => {
            const xpNeeded = xpForLevel(belt.minLevel);
            const isEarned = currentLevel >= belt.minLevel;
            const isCurrent = belt.name === currentBelt.name;
            const isNext = !isEarned && (index === 0 || currentLevel >= BELTS[index - 1].minLevel);

            return (
              <div
                key={belt.name}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
                  isCurrent
                    ? "bg-accent-200/50 dark:bg-accent-900/20 border border-accent-300/50 dark:border-accent-700/30"
                    : isNext
                      ? "bg-gray-50 dark:bg-dark-muted border border-dashed border-gray-200 dark:border-dark-border"
                      : ""
                }`}
              >
                <div className={`h-6 w-6 rounded-full shrink-0 border-2 ${belt.color} ${
                  isEarned
                    ? "border-gray-300/50 dark:border-gray-600/50"
                    : "opacity-30 border-gray-300/30 dark:border-gray-600/30"
                }`} />

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${
                    isEarned
                      ? "text-gray-900 dark:text-gray-50"
                      : "text-gray-400 dark:text-gray-500"
                  }`}>
                    {belt.name}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">
                    {xpNeeded === 0 ? "Starting rank" : `${xpNeeded.toLocaleString()} XP`}
                  </p>
                </div>

                {isEarned && (
                  <CheckIcon size={16} className="text-success-600 shrink-0" />
                )}
                {isCurrent && (
                  <span className="text-[10px] font-semibold text-accent-700 dark:text-accent-400 shrink-0">
                    YOU
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-dark-border text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {totalXp.toLocaleString()} XP earned total
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
