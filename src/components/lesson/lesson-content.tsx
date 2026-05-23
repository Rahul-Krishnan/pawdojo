"use client";

import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SessionLogForm } from "./session-log-form";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-700 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="stroke-current">
          <path d="M10 12L6 8L10 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back
      </Link>

      <p className="text-xs font-semibold uppercase tracking-widest text-primary-600">
        {skillName}
      </p>
      <h1 className="mt-1 text-2xl font-bold text-gray-900">{title}</h1>

      {isCompleted && (
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="stroke-current">
            <path d="M3 7L6 10L11 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Completed
        </span>
      )}

      <article className="prose prose-sm mt-6 max-w-none prose-headings:font-heading prose-headings:text-gray-900 prose-h2:text-lg prose-h3:text-base prose-p:text-gray-700 prose-strong:text-gray-900 prose-li:text-gray-700">
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
                onClose={() => setShowLogForm(false)}
              />
            </motion.div>
          ) : (
            <motion.button
              key="button"
              onClick={() => setShowLogForm(true)}
              className="w-full rounded-2xl bg-primary-600 py-4 text-base font-semibold text-white shadow-lg shadow-primary-600/25 hover:bg-primary-700 active:scale-[0.98] transition-all"
              whileTap={{ scale: 0.97 }}
            >
              I trained my dog! (+{xpReward} XP)
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
