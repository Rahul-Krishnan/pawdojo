"use client";

import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SessionLogForm } from "./session-log-form";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeftIcon, CheckIcon } from "@/components/icons";

export function LessonContent({
  lessonId,
  skillId,
  skillName,
  title,
  contentMd,
  xpReward,
  isCompleted,
}: {
  lessonId: string;
  skillId: string;
  skillName: string;
  title: string;
  contentMd: string;
  xpReward: number;
  isCompleted: boolean;
}) {
  const [showLogForm, setShowLogForm] = useState(false);
  const router = useRouter();

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
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary-100 dark:bg-primary-900/40 px-3 py-1 text-xs font-semibold text-primary-700 dark:text-primary-300">
          <CheckIcon size={14} />
          Completed
        </span>
      )}

      <article
        className="prose prose-sm mt-6 max-w-none prose-headings:font-heading prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-h2:text-lg prose-h3:text-base prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-li:text-gray-700 dark:prose-li:text-gray-300"
        role="article"
        aria-label={`Lesson: ${title}`}
      >
        <Markdown remarkPlugins={[remarkGfm]}>{contentMd}</Markdown>
      </article>

      <div className="mt-8 pb-6">
        <AnimatePresence mode="wait">
          {showLogForm ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <SessionLogForm
                lessonId={lessonId}
                skillId={skillId}
                isRetake={isCompleted}
                onClose={() => setShowLogForm(false)}
              />
            </motion.div>
          ) : (
            <motion.button
              key="button"
              onClick={() => setShowLogForm(true)}
              className={`w-full rounded-2xl py-4 text-base font-semibold shadow-lg active:scale-[0.98] transition-all ${
                isCompleted
                  ? "bg-accent-500 text-white shadow-accent-500/25 hover:bg-accent-600"
                  : "bg-primary-600 text-white shadow-primary-600/25 hover:bg-primary-700"
              }`}
              whileTap={{ scale: 0.97 }}
              aria-label={isCompleted ? "Practice this lesson again" : "Log a training session"}
            >
              {isCompleted
                ? "Practice Again (+XP)"
                : `I trained my dog! (+${xpReward} XP)`}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
