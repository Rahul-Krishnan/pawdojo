"use client";

import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { SessionCard } from "@/components/shared/session-card";
import { SessionHistoryModal } from "@/components/progress/session-history-modal";
import { playTap } from "@/lib/sounds";

type RecentSession = {
  id: string;
  skillName: string;
  rating: number;
  reps: number | null;
  durationMin: number | null;
  notes: string | null;
  loggedAt: string;
  href?: string;
};

export function RecentSessions({
  sessions,
  dogId,
}: {
  sessions: RecentSession[];
  dogId: string;
}) {
  const [showModal, setShowModal] = useState(false);

  if (sessions.length === 0) return null;

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Recent Sessions
        </h2>
        <button
          onClick={() => { setShowModal(true); playTap(); }}
          className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 transition-colors"
        >
          See All
        </button>
      </div>
      <div className="space-y-2">
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            skillName={session.skillName}
            rating={session.rating}
            reps={session.reps}
            durationMin={session.durationMin}
            notes={session.notes}
            loggedAt={session.loggedAt}
            href={session.href}
          />
        ))}
      </div>

      <AnimatePresence>
        {showModal && (
          <SessionHistoryModal
            dogId={dogId}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
