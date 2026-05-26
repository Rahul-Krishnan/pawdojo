"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { playTap } from "@/lib/sounds";

export function TodayLessonCard({
  lessonId,
  title,
  skillName,
}: {
  lessonId: string;
  title: string;
  skillName: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.3 }}
    >
      <Link
        href={`/lesson/${lessonId}`}
        onClick={() => playTap()}
        className="block rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 p-6 text-white shadow-lg shadow-primary-500/20 transition-all hover:shadow-xl hover:shadow-primary-500/30 active:scale-[0.98]"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-200">
              {skillName}
            </p>
            <h2 className="mt-2 text-lg font-bold">{title}</h2>
          </div>
          <Image src="/images/logo.svg" alt="" width={40} height={40} className="opacity-30" />
        </div>
        <p className="mt-4 text-sm font-semibold text-primary-200">
          Start Training →
        </p>
      </Link>
    </motion.div>
  );
}
