"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "motion/react";
import { CheckIcon } from "@/components/icons";
import { SessionCard } from "@/components/shared/session-card";
import { playTap } from "@/lib/sounds";

type Session = {
  id: string;
  lessonName: string;
  lessonHref: string | null;
  rating: number;
  reps: number | null;
  duration_min: number | null;
  notes: string | null;
  logged_at: string;
};

type LessonInfo = { id: string; skill_id: string; title: string };

const PAGE_SIZE = 20;

export function SessionsStatCard({
  sessionCount,
  dogId,
}: {
  sessionCount: number;
  dogId: string;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => { setShowModal(true); playTap(); }}
        className="rounded-2xl bg-surface-elevated dark:bg-dark-elevated border border-gray-100 dark:border-dark-border p-4 text-left transition-colors hover:bg-surface-muted dark:hover:bg-dark-muted active:scale-[0.98]"
      >
        <div className="flex items-center gap-2">
          <CheckIcon size={18} className="text-success-600" />
          <span className="text-2xl font-bold font-heading text-gray-900 dark:text-gray-50">
            {sessionCount}
          </span>
        </div>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Sessions
        </p>
      </button>

      <AnimatePresence>
        {showModal && (
          <SessionHistoryModal
            dogId={dogId}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export function SessionHistoryModal({
  dogId,
  onClose,
}: {
  dogId: string;
  onClose: () => void;
}) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [lessonsMap, setLessonsMap] = useState<Map<string, LessonInfo>>(new Map());
  const supabase = createClient();

  // Load lessons once to resolve skill_id -> lesson name/href
  useEffect(() => {
    supabase
      .from("lessons")
      .select("id, skill_id, title")
      .order("path_order")
      .then(({ data }) => {
        const map = new Map<string, LessonInfo>();
        for (const lesson of data ?? []) {
          if (!map.has(lesson.skill_id)) {
            map.set(lesson.skill_id, lesson);
          }
        }
        setLessonsMap(map);
      });
  }, []);

  const fetchPage = useCallback(async (pageOffset: number) => {
    setLoading(true);
    const { data } = await supabase
      .from("training_sessions")
      .select("id, skill_id, rating, reps, duration_min, notes, logged_at, skills(name)")
      .eq("dog_id", dogId)
      .not("skill_id", "is", null)
      .order("logged_at", { ascending: false })
      .range(pageOffset, pageOffset + PAGE_SIZE - 1);

    const mapped = (data ?? []).map((row) => {
      const lesson = lessonsMap.get(row.skill_id ?? "");
      return {
        id: row.id,
        lessonName: lesson?.title ?? (row.skills as unknown as { name: string })?.name ?? "Training",
        lessonHref: lesson ? `/lesson/${lesson.id}` : null,
        rating: row.rating ?? 0,
        reps: row.reps,
        duration_min: row.duration_min,
        notes: row.notes,
        logged_at: row.logged_at,
      };
    });

    setSessions((prev) => pageOffset === 0 ? mapped : [...prev, ...mapped]);
    setHasMore(mapped.length === PAGE_SIZE);
    setOffset(pageOffset + PAGE_SIZE);
    setLoading(false);
  }, [dogId, supabase, lessonsMap]);

  useEffect(() => {
    if (lessonsMap.size > 0) {
      fetchPage(0);
    }
  }, [lessonsMap]);

  function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    const target = event.currentTarget;
    const nearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    if (nearBottom && hasMore && !loading) {
      fetchPage(offset);
    }
  }

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
        className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-surface-elevated dark:bg-dark-elevated border border-gray-100 dark:border-dark-border shadow-2xl max-h-[80vh] flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 pb-3 shrink-0">
          <h2 className="text-lg font-bold font-heading text-gray-900 dark:text-gray-50">
            Session History
          </h2>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            Done
          </button>
        </div>

        <div
          className="overflow-y-auto px-5 pb-8 sm:pb-5"
          onScroll={handleScroll}
        >
          {sessions.length === 0 && !loading && (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">
              No sessions logged yet
            </p>
          )}

          <div className="space-y-2">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                skillName={session.lessonName}
                rating={session.rating}
                reps={session.reps}
                durationMin={session.duration_min}
                notes={session.notes}
                loggedAt={session.logged_at}
                href={session.lessonHref ?? undefined}
              />
            ))}
          </div>

          {loading && (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-primary-500" />
            </div>
          )}

          {!hasMore && sessions.length > 0 && (
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-3">
              All sessions loaded
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
