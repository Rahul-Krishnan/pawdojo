"use client";

import { useState } from "react";
import { logSession } from "@/app/actions/log-session";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { StarIcon, CheckIcon } from "@/components/icons";
import { playTap, playSuccess, playXpEarned, playBadgeUnlock } from "@/lib/sounds";
import { AchievementPopup } from "./achievement-popup";

const ratingLabels = ["Rough", "Tricky", "OK", "Good", "Nailed it"];
const ratingColors = [
  "bg-red-500",
  "bg-orange-500",
  "bg-accent-500",
  "bg-success-600",
  "bg-success-700",
];
const repOptions = [3, 5, 8, 10];
const durationOptions = [
  { label: "Quick", sub: "2 min", value: 2 },
  { label: "Normal", sub: "5 min", value: 5 },
  { label: "Long", sub: "10+ min", value: 10 },
];

export function SessionLogForm({
  lessonId,
  skillId,
  isRetake = false,
  xpReward = 10,
  onClose,
}: {
  lessonId: string;
  skillId: string;
  isRetake?: boolean;
  xpReward?: number;
  onClose: () => void;
}) {
  const [rating, setRating] = useState(3);
  const [reps, setReps] = useState<number | null>(5);
  const [durationMin, setDurationMin] = useState<number | null>(5);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    xpAwarded: number;
    achievementsUnlocked: string[];
  } | null>(null);
  const [showAchievements, setShowAchievements] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    const response = await logSession({
      lessonId,
      skillId,
      rating,
      reps,
      durationMin,
      notes,
      isRetake,
    });

    if (response.error) {
      setError(response.error);
      setLoading(false);
      return;
    }

    if (response.success) {
      playSuccess();
      if (response.xpAwarded && response.xpAwarded > 0) {
        setTimeout(() => playXpEarned(), 400);
      }
      const unlocked = response.achievementsUnlocked ?? [];
      if (unlocked.length > 0) {
        setTimeout(() => playBadgeUnlock(), 800);
      }
      setResult({
        xpAwarded: response.xpAwarded ?? 0,
        achievementsUnlocked: unlocked,
      });
      if (unlocked.length > 0) {
        setTimeout(() => setShowAchievements(true), 1200);
      } else {
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 2500);
      }
    }

    setLoading(false);
  }

  function handleAchievementsDone() {
    setShowAchievements(false);
    router.push("/dashboard");
    router.refresh();
  }

  if (result) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/20 p-8 text-center border border-primary-200/50 dark:border-primary-700/30"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 400, damping: 15 }}
          >
            <CheckIcon size={48} className="mx-auto text-success-600 dark:text-success-400" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-3 text-xl font-bold font-heading text-gray-900 dark:text-gray-50"
          >
            Session logged!
          </motion.p>
          {result.xpAwarded > 0 && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="mt-2 text-lg font-semibold text-xp"
            >
              +{result.xpAwarded} XP
            </motion.p>
          )}
        </motion.div>
        {showAchievements && (
          <AchievementPopup
            achievements={result.achievementsUnlocked}
            onDone={handleAchievementsDone}
          />
        )}
      </>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
          How did it go?
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <motion.button
              key={value}
              type="button"
              onClick={() => { setRating(value); playTap(); }}
              whileTap={{ scale: 0.9 }}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-3 transition-all ${
                rating === value
                  ? `${ratingColors[value - 1]} text-white shadow-md`
                  : "bg-gray-100 dark:bg-dark-muted text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-border"
              }`}
            >
              <StarIcon size={16} className={rating >= value ? "opacity-100" : "opacity-30"} />
              <span className="text-xs font-medium">{value}</span>
            </motion.button>
          ))}
        </div>
        <p className="mt-1.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
          {ratingLabels[rating - 1]}
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
          Reps completed
        </label>
        <div className="flex gap-2">
          {repOptions.map((value) => (
            <motion.button
              key={value}
              type="button"
              onClick={() => { setReps(value); playTap(); }}
              whileTap={{ scale: 0.9 }}
              className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-all ${
                reps === value
                  ? "bg-success-600 text-white shadow-md"
                  : "bg-gray-100 dark:bg-dark-muted text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-border"
              }`}
            >
              {value}+
            </motion.button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
          Session length
        </label>
        <div className="flex gap-2">
          {durationOptions.map((option) => (
            <motion.button
              key={option.value}
              type="button"
              onClick={() => { setDurationMin(option.value); playTap(); }}
              whileTap={{ scale: 0.9 }}
              className={`flex flex-1 flex-col items-center rounded-xl py-3 transition-all ${
                durationMin === option.value
                  ? "bg-success-600 text-white shadow-md"
                  : "bg-gray-100 dark:bg-dark-muted text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-border"
              }`}
            >
              <span className="text-sm font-semibold">{option.label}</span>
              <span className="text-[10px] opacity-70">{option.sub}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="notes"
          className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
        >
          Notes (optional)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={2}
          className="w-full rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-muted px-4 py-3 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:bg-white dark:focus:bg-dark-elevated focus:outline-none focus:ring-1 focus:ring-primary-500/20 transition-all"
          placeholder="Any observations about your dog's progress..."
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <motion.button
        type="submit"
        disabled={loading}
        whileTap={{ scale: 0.97 }}
        className="w-full rounded-2xl py-4 text-base font-semibold shadow-lg active:scale-[0.98] transition-all bg-success-600 text-white shadow-success-600/25 hover:bg-success-700 disabled:opacity-50"
      >
        {loading ? "Logging..." : `I trained my dog! (+${xpReward} XP)`}
      </motion.button>
    </form>
  );
}
