"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SessionLogForm } from "./session-log-form";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
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
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-success-100 dark:bg-success-900/40 px-3 py-1 text-xs font-semibold text-success-700 dark:text-success-300">
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
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {isCompleted ? "Practice Again" : "Log Training"}
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
