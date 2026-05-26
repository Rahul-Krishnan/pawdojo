"use client";

import { motion, AnimatePresence } from "motion/react";
import { TrophyIcon } from "@/components/icons";

export function AchievementPopup({
  achievements,
  onDone,
}: {
  achievements: string[];
  onDone: () => void;
}) {
  if (achievements.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-6"
        onClick={onDone}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-accent-50 to-accent-100 dark:from-accent-950/80 dark:to-accent-900/60 p-8 text-center border border-accent-200 dark:border-accent-700/40 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 400, damping: 12 }}
          >
            <TrophyIcon size={64} className="mx-auto text-accent-500" />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-4 text-xs font-semibold uppercase tracking-widest text-accent-600 dark:text-accent-400"
          >
            Award Earned!
          </motion.p>

          {achievements.map((name, index) => (
            <motion.p
              key={name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.15 }}
              className="mt-2 text-xl font-bold font-heading text-gray-900 dark:text-gray-50"
            >
              {name}
            </motion.p>
          ))}

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            onClick={onDone}
            className="mt-6 rounded-xl bg-accent-500 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-accent-600 transition-colors"
          >
            Awesome!
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
