"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { getBelt, getNextBelt, xpForLevel, BELTS } from "@/lib/gamification/xp";
import { playTap } from "@/lib/sounds";

export function XpStatCard({
  totalXp,
  currentLevel,
}: {
  totalXp: number;
  currentLevel: number;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => { setShowModal(true); playTap(); }}
        className="rounded-2xl bg-surface-elevated dark:bg-dark-elevated border border-gray-100 dark:border-dark-border p-4 text-left transition-colors hover:bg-surface-muted dark:hover:bg-dark-muted active:scale-[0.98]"
      >
        <div className="flex items-center gap-2">
          <Image src="/images/xp.svg" alt="" width={24} height={24} className="shrink-0 dark:brightness-90" />
          <span className="text-2xl font-bold font-heading text-gray-900 dark:text-gray-50">
            {totalXp}
          </span>
        </div>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Total XP
        </p>
      </button>

      <AnimatePresence>
        {showModal && (
          <XpModal
            totalXp={totalXp}
            currentLevel={currentLevel}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function XpModal({
  totalXp,
  currentLevel,
  onClose,
}: {
  totalXp: number;
  currentLevel: number;
  onClose: () => void;
}) {
  const belt = getBelt(currentLevel);
  const nextBelt = getNextBelt(currentLevel);

  const currentBeltXp = xpForLevel(belt.minLevel);
  const nextBeltXp = nextBelt ? xpForLevel(nextBelt.minLevel) : currentBeltXp;
  const progressPercent = nextBelt
    ? Math.min(((totalXp - currentBeltXp) / (nextBeltXp - currentBeltXp)) * 100, 100)
    : 100;

  return (
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
        className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-surface-elevated dark:bg-dark-elevated border border-gray-100 dark:border-dark-border p-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] sm:pb-6 shadow-2xl max-h-[85dvh] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold font-heading text-gray-900 dark:text-gray-50">
            XP Progress
          </h2>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            Done
          </button>
        </div>

        <div className="flex items-center justify-center mb-4">
          <Image src="/images/xp.svg" alt="" width={64} height={64} className="dark:brightness-90" />
        </div>

        <p className="text-center text-3xl font-bold font-heading text-gray-900 dark:text-gray-50">
          {totalXp.toLocaleString()} XP
        </p>

        <div className="mt-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className={`h-6 w-6 rounded-full shrink-0 border-2 ${belt.color} border-gray-300/50 dark:border-gray-600/50`} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">{belt.name}</p>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-200/60 dark:bg-gray-700/40">
                <div
                  className="h-full rounded-full bg-primary-500 transition-all duration-700 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between">
                <p className="text-[10px] text-gray-400">{totalXp} XP</p>
                {nextBelt && (
                  <p className="text-[10px] text-gray-400">{nextBeltXp.toLocaleString()} XP</p>
                )}
              </div>
            </div>
          </div>

          {nextBelt && (
            <div className="flex items-center gap-3 opacity-50">
              <div className={`h-6 w-6 rounded-full shrink-0 border-2 ${nextBelt.color} border-gray-300/30 dark:border-gray-600/30`} />
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {nextBelt.name} at {nextBeltXp.toLocaleString()} XP
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
