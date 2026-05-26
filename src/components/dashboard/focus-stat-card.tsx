"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence } from "motion/react";
import { FocusModal } from "./focus-modal";
import { playTap } from "@/lib/sounds";

export function FocusStatCard({
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
        className="rounded-2xl bg-surface-elevated dark:bg-dark-elevated border border-gray-100 dark:border-dark-border p-4 text-left transition-colors hover:bg-surface-muted dark:hover:bg-dark-muted active:scale-[0.98]"
      >
        <div className="flex items-center gap-2">
          <Image src="/images/focus.svg" alt="" width={40} height={40} className="shrink-0 dark:brightness-90" />
          <span className="text-2xl font-bold font-heading text-gray-900 dark:text-gray-50">
            {longestStreak}
          </span>
        </div>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Best Focus
        </p>
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
