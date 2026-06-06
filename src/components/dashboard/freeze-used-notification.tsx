"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";

// Shown once after one or more streak saves were consumed to cover a missed
// day, so the drop in "Saves Remaining" is explained rather than silent.
// Wording mirrors the FocusModal copy about saves protecting the streak.
export function FreezeUsedNotification({
  count,
  freezeRemaining,
  onClose,
}: {
  count: number;
  freezeRemaining: number;
  onClose: () => void;
}) {
  const saveWord = count === 1 ? "save" : "saves";
  const remainingWord = freezeRemaining === 1 ? "save" : "saves";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-surface-elevated dark:bg-dark-elevated border border-gray-100 dark:border-dark-border p-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] sm:pb-6 shadow-2xl text-center"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-center mb-5">
            <Image
              src="/images/focus.svg"
              alt=""
              width={96}
              height={96}
              className="dark:brightness-90"
            />
          </div>

          <p className="text-xs font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400">
            Streak save used
          </p>

          <h2 className="mt-2 text-xl font-bold font-heading text-gray-900 dark:text-gray-50">
            {count === 1
              ? "A save protected your streak"
              : `${count} saves protected your streak`}
          </h2>

          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            You missed a day, so {count === 1 ? "a save was" : `${count} ${saveWord} were`}{" "}
            used to keep your focus going. Saves protect your streak when you
            miss a day, and you earn one back every 7 days of focus.
          </p>

          <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">
            {freezeRemaining > 0
              ? `${freezeRemaining} ${remainingWord} remaining`
              : "No saves remaining"}
          </p>

          <button
            onClick={onClose}
            className="mt-6 w-full rounded-xl bg-primary-500 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-primary-600 transition-colors"
          >
            Got it
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
