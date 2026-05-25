"use client";

import { useState } from "react";
import { updateDog } from "@/app/actions/update-profile";
import { useRouter } from "next/navigation";
import { playSuccess } from "@/lib/sounds";

export function EditDogForm({
  dogId,
  initialName,
  initialBreed,
  initialBirthday,
}: {
  dogId: string;
  initialName: string;
  initialBreed: string | null;
  initialBirthday: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [breed, setBreed] = useState(initialBreed ?? "");
  const [birthday, setBirthday] = useState(initialBirthday ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 transition-colors"
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
      birthday: birthday || null,
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
    "w-full rounded-lg border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-muted px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:bg-white dark:focus:bg-dark-elevated focus:outline-none focus:ring-1 focus:ring-primary-500/20 transition-all";

  return (
    <div className="mt-3 space-y-2.5">
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={inputClass}
          required
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Breed</label>
        <input
          type="text"
          value={breed}
          onChange={(event) => setBreed(event.target.value)}
          className={inputClass}
          placeholder="Optional"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Birthday</label>
        <input
          type="date"
          max={new Date().toISOString().split("T")[0]}
          value={birthday}
          onChange={(event) => setBirthday(event.target.value)}
          className={inputClass}
        />
      </div>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded px-2 py-1">{error}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setEditing(false);
            setName(initialName);
            setBreed(initialBreed ?? "");
            setBirthday(initialBirthday ?? "");
            setError(null);
          }}
          className="flex-1 rounded-lg border border-gray-200 dark:border-dark-border py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-muted transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={loading || !name.trim()}
          className="flex-1 rounded-lg bg-success-600 py-2 text-xs font-semibold text-white hover:bg-success-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
