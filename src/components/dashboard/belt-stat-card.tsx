"use client";

import { useState } from "react";
import { getBelt } from "@/lib/gamification/xp";
import { AnimatePresence } from "motion/react";
import { BeltProgressionModal } from "./belt-modal";
import { playTap } from "@/lib/sounds";

export function BeltStatCard({
  currentLevel,
  totalXp,
}: {
  currentLevel: number;
  totalXp: number;
}) {
  const [showModal, setShowModal] = useState(false);
  const belt = getBelt(currentLevel);

  return (
    <>
      <button
        onClick={() => { setShowModal(true); playTap(); }}
        className="rounded-2xl bg-surface-elevated dark:bg-dark-elevated border border-gray-100 dark:border-dark-border p-4 text-left transition-colors hover:bg-surface-muted dark:hover:bg-dark-muted active:scale-[0.98]"
      >
        <div className="flex items-center gap-2">
          <div className={`h-5 w-5 rounded-full ${belt.color} border border-gray-300/50 dark:border-gray-600/50 shrink-0`} />
          <span className="text-2xl font-bold font-heading text-gray-900 dark:text-gray-50">
            {belt.name.replace(" Belt", "")}
          </span>
        </div>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Belt
        </p>
      </button>

      <AnimatePresence>
        {showModal && (
          <BeltProgressionModal
            currentLevel={currentLevel}
            totalXp={totalXp}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
