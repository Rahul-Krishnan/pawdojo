"use client";

import { useState } from "react";
import { updateDog } from "@/app/actions/update-profile";
import { useRouter } from "next/navigation";
import { playSuccess } from "@/lib/sounds";

export function EditDogForm({
  dogId,
  initialName,
  initialBreed,
  initialAgeMonths,
}: {
  dogId: string;
  initialName: string;
  initialBreed: string | null;
  initialAgeMonths: number | null;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [breed, setBreed] = useState(initialBreed ?? "");
  const [ageMonths, setAgeMonths] = useState(
    initialAgeMonths?.toString() ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
      >
        Edit
      </button>
    );
  }

  async function handleSave() {
    setError(null);
    setLoading(true);

    const result = await updateDog({
      dogId,
      name,
      breed: breed || null,
      ageMonths: ageMonths ? parseInt(ageMonths, 10) : null,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    playSuccess();
    setEditing(false);
    setLoading(false);
    router.refresh();
  }

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500/20 transition-all";

  return (
    <div className="mt-3 space-y-2.5">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={inputClass}
          required
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Breed</label>
        <input
          type="text"
          value={breed}
          onChange={(event) => setBreed(event.target.value)}
          className={inputClass}
          placeholder="Optional"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Age (months)</label>
        <input
          type="number"
          min="0"
          max="360"
          value={ageMonths}
          onChange={(event) => setAgeMonths(event.target.value)}
          className={inputClass}
          placeholder="Optional"
        />
      </div>
      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{error}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setEditing(false);
            setName(initialName);
            setBreed(initialBreed ?? "");
            setAgeMonths(initialAgeMonths?.toString() ?? "");
            setError(null);
          }}
          className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={loading || !name.trim()}
          className="flex-1 rounded-lg bg-primary-600 py-2 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
