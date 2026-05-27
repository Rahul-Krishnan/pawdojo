"use client";

import { useState } from "react";
import { deleteDog } from "@/app/actions/delete-dog";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";

export function DeleteDogButton({
  dogId,
  dogName,
  isLastDog,
}: {
  dogId: string;
  dogName: string;
  isLastDog: boolean;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (isLastDog) return null;

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const result = await deleteDog(dogId);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setShowConfirm(false);
    setLoading(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="text-xs font-medium text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
      >
        Delete
      </button>

      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-6"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-sm rounded-2xl bg-surface-elevated dark:bg-dark-elevated border border-gray-100 dark:border-dark-border p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 className="text-lg font-bold font-heading text-gray-900 dark:text-gray-50">
                Delete {dogName}?
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                This will permanently delete all training sessions, lesson progress, and skill data for {dogName}. This cannot be undone.
              </p>

              {error && (
                <p className="mt-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded px-2 py-1">
                  {error}
                </p>
              )}

              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 rounded-xl border border-gray-200 dark:border-dark-border py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
