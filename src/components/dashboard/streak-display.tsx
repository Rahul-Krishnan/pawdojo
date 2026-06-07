"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence } from "motion/react";
import { FocusModal } from "./focus-modal";
import { playTap } from "@/lib/sounds";

export function StreakDisplay({
  currentStreak,
  longestStreak,
  freezeAvailable,
}: {
  currentStreak: number;
  longestStreak: number;
  freezeAvailable: number;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => { setShowModal(true); playTap(); }}
        className="flex-1 rounded-2xl bg-surface-elevated dark:bg-dark-elevated border border-gray-100 dark:border-dark-border p-4 text-left transition-colors hover:bg-surface-muted dark:hover:bg-dark-muted active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <Image src="/images/focus.svg" alt="" width={72} height={72} className="dark:brightness-90 shrink-0" />
          <div>
            <span className="text-3xl font-bold font-heading text-gray-900 dark:text-gray-50">
              {currentStreak}
            </span>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {currentStreak === 1 ? "day" : "days"} focus
            </p>
            <p
              className={`mt-1 text-xs ${
                freezeAvailable === 0
                  ? "text-gray-500 dark:text-gray-400"
                  : "text-primary-500 dark:text-primary-400"
              }`}
            >
              {freezeAvailable === 0
                ? "No saves remaining"
                : `${freezeAvailable} save${freezeAvailable > 1 ? "s" : ""} remaining`}
            </p>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {showModal && (
          <FocusModal
            currentStreak={currentStreak}
            longestStreak={longestStreak}
            freezeAvailable={freezeAvailable}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
