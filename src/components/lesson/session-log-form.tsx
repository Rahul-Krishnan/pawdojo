"use client";

import { useState } from "react";
import { logSession } from "@/app/actions/log-session";
import { useRouter } from "next/navigation";

const ratingLabels = ["Rough", "Tricky", "OK", "Good", "Nailed it"];
const repOptions = [3, 5, 8, 10];
const durationOptions = [
  { label: "Quick (2 min)", value: 2 },
  { label: "Normal (5 min)", value: 5 },
  { label: "Long (10+ min)", value: 10 },
];

export function SessionLogForm({
  lessonId,
  skillId,
  onClose,
}: {
  lessonId: string;
  skillId: string;
  onClose: () => void;
}) {
  const [rating, setRating] = useState(3);
  const [reps, setReps] = useState<number | null>(5);
  const [durationMin, setDurationMin] = useState<number | null>(5);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    xpAwarded: number;
    achievementsUnlocked: string[];
  } | null>(null);
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
    });

    if (response.success) {
      setResult({
        xpAwarded: response.xpAwarded ?? 0,
        achievementsUnlocked: response.achievementsUnlocked ?? [],
      });
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 2000);
    }

    setLoading(false);
  }

  if (result) {
    return (
      <div className="rounded-xl bg-green-50 p-6 text-center">
        <p className="text-2xl">✅</p>
        <p className="mt-2 text-lg font-semibold text-green-800">
          Session logged!
        </p>
        {result.xpAwarded > 0 && (
          <p className="mt-1 text-sm text-green-600">
            +{result.xpAwarded} XP
          </p>
        )}
        {result.achievementsUnlocked.length > 0 && (
          <p className="mt-1 text-sm text-yellow-600">
            🏆 {result.achievementsUnlocked.join(", ")}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          How did it go?
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              className={`flex-1 rounded-lg py-3 text-sm font-medium transition-colors ${
                rating === value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
        <p className="mt-1 text-center text-xs text-gray-500">
          {ratingLabels[rating - 1]}
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Reps completed
        </label>
        <div className="flex gap-2">
          {repOptions.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setReps(value)}
              className={`flex-1 rounded-lg py-3 text-sm font-medium transition-colors ${
                reps === value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {value}+
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Session length
        </label>
        <div className="flex gap-2">
          {durationOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDurationMin(option.value)}
              className={`flex-1 rounded-lg py-3 text-xs font-medium transition-colors ${
                durationMin === option.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="notes"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Notes (optional)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={2}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Any observations about your dog's progress..."
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-lg border border-gray-300 py-3 text-sm font-medium text-gray-600"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-lg bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Logging..." : "Log Session"}
        </button>
      </div>
    </form>
  );
}
