"use client";

import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SessionLogForm } from "./session-log-form";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeftIcon, CheckIcon, StarIcon, ChevronRightIcon } from "@/components/icons";

export type SessionRecord = {
  id: string;
  rating: number;
  notes: string | null;
  loggedAt: string;
  reps: number | null;
  durationMin: number | null;
};

export function LessonContent({
  lessonId,
  skillId,
  skillName,
  title,
  contentMd,
  xpReward,
  isCompleted,
  sessions = [],
}: {
  lessonId: string;
  skillId: string;
  skillName: string;
  title: string;
  contentMd: string;
  xpReward: number;
  isCompleted: boolean;
  sessions?: SessionRecord[];
}) {
  const router = useRouter();
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <button
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-700 dark:hover:text-primary-400 transition-colors"
        aria-label="Go back"
      >
        <ArrowLeftIcon size={16} />
        Back
      </button>

      <p className="text-xs font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400">
        {skillName}
      </p>
      <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-50">{title}</h1>

      {isCompleted && (
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-success-100 dark:bg-success-900/40 px-3 py-1 text-xs font-semibold text-success-700 dark:text-success-300">
          <CheckIcon size={14} />
          Practiced {sessions.length} time{sessions.length !== 1 ? "s" : ""}
        </span>
      )}

      <article
        className="prose prose-sm mt-6 max-w-none prose-headings:font-heading prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-h2:text-lg prose-h3:text-base prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-li:text-gray-700 dark:prose-li:text-gray-300"
        role="article"
        aria-label={`Lesson: ${title}`}
      >
        <Markdown remarkPlugins={[remarkGfm]}>{contentMd}</Markdown>
      </article>

      {sessions.length > 0 && (
        <section className="mt-6">
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="flex w-full items-center justify-between rounded-xl bg-surface-elevated dark:bg-dark-elevated border border-gray-100 dark:border-dark-border px-4 py-3 transition-colors hover:bg-surface-muted dark:hover:bg-dark-muted"
          >
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Session History ({sessions.length})
            </span>
            <ChevronRightIcon
              size={16}
              className={`text-gray-400 transition-transform ${historyOpen ? "rotate-90" : ""}`}
            />
          </button>
          {historyOpen && (
            <div className="mt-2 space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-xl bg-surface-elevated dark:bg-dark-elevated border border-gray-100 dark:border-dark-border px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <StarIcon
                          key={index}
                          size={14}
                          className={index < session.rating ? "text-accent-400" : "text-gray-200 dark:text-gray-600"}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(session.loggedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  {(session.reps || session.durationMin) && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {[
                        session.reps ? `${session.reps}+ reps` : null,
                        session.durationMin ? `${session.durationMin} min` : null,
                      ].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {session.notes && (
                    <p className="mt-1.5 text-xs text-gray-600 dark:text-gray-300 italic">
                      {session.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="mt-6 pb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Log Training
        </h2>
        <SessionLogForm
          lessonId={lessonId}
          skillId={skillId}
          isRetake={isCompleted}
          xpReward={xpReward}
          onClose={() => router.back()}
        />
      </div>
    </motion.div>
  );
}
