"use client";

import { useState } from "react";
import Image from "next/image";
import { SnowflakeIcon } from "@/components/icons";
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
        <div className="flex items-center gap-2">
          <Image src="/images/focus.svg" alt="" width={72} height={72} className="dark:brightness-90" />
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
