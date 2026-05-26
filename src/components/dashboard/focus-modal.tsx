"use client";

import Image from "next/image";
import { motion } from "motion/react";

export function FocusModal({
  currentStreak,
  longestStreak,
  freezeAvailable,
  onClose,
}: {
  currentStreak: number;
  longestStreak: number;
  freezeAvailable: number;
  onClose: () => void;
}) {
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
        className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-surface-elevated dark:bg-dark-elevated border border-gray-100 dark:border-dark-border p-6 pb-10 sm:pb-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold font-heading text-gray-900 dark:text-gray-50">
            Focus
          </h2>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            Done
          </button>
        </div>

        <div className="flex items-center justify-center mb-6">
          <Image src="/images/focus.svg" alt="" width={64} height={64} className="dark:brightness-90" />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-surface-muted dark:bg-dark-muted px-4 py-3">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Current Focus</p>
            <p className="text-2xl font-bold font-heading text-gray-900 dark:text-gray-50">
              {currentStreak} <span className="text-sm font-normal text-gray-400">days</span>
            </p>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-surface-muted dark:bg-dark-muted px-4 py-3">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Best Focus</p>
            <p className="text-2xl font-bold font-heading text-gray-900 dark:text-gray-50">
              {longestStreak} <span className="text-sm font-normal text-gray-400">days</span>
            </p>
          </div>

          {freezeAvailable > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-surface-muted dark:bg-dark-muted px-4 py-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Freezes Available</p>
              <p className="text-2xl font-bold font-heading text-gray-900 dark:text-gray-50">
                {freezeAvailable}
              </p>
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 text-center">
          Train daily to build your focus streak
        </p>
      </motion.div>
    </motion.div>
  );
}
