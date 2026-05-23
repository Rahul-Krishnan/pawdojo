"use client";

import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SessionLogForm } from "./session-log-form";
import Link from "next/link";

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
    <div>
      <Link
        href="/dashboard"
        className="mb-4 inline-block text-sm text-gray-500 hover:text-gray-700"
      >
        ← Back
      </Link>

      <p className="text-xs font-medium uppercase tracking-wide text-blue-500">
        {skillName}
      </p>
      <h1 className="mt-1 text-2xl font-bold">{title}</h1>

      {isCompleted && (
        <span className="mt-2 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
          Completed ✓
        </span>
      )}

      <article className="prose prose-sm mt-6 max-w-none">
        <Markdown remarkPlugins={[remarkGfm]}>{contentMd}</Markdown>
      </article>

      <div className="mt-8">
        {showLogForm ? (
          <SessionLogForm
            lessonId={lessonId}
            skillId={skillId}
            onClose={() => setShowLogForm(false)}
          />
        ) : (
          <button
            onClick={() => setShowLogForm(true)}
            className="w-full rounded-xl bg-blue-600 py-4 text-base font-semibold text-white hover:bg-blue-700"
          >
            I trained my dog! (+{xpReward} XP)
          </button>
        )}
      </div>
    </div>
  );
}
