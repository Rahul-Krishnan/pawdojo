"use client";

import { useState } from "react";
import { createDog } from "@/app/actions/create-dog";
import { motion } from "motion/react";

export function DogForm() {
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [ageMonths, setAgeMonths] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const result = await createDog({
      name,
      breed: breed || null,
      ageMonths: ageMonths ? parseInt(ageMonths, 10) : null,
    });

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-base focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500/20 transition-all";

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-4"
    >
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-gray-700">
          Dog&apos;s name *
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          className={inputClass}
          placeholder="e.g. Biscuit"
        />
      </div>
      <div>
        <label htmlFor="breed" className="mb-1.5 block text-sm font-semibold text-gray-700">
          Breed (optional)
        </label>
        <input
          id="breed"
          type="text"
          value={breed}
          onChange={(event) => setBreed(event.target.value)}
          className={inputClass}
          placeholder="e.g. Golden Retriever"
        />
      </div>
      <div>
        <label htmlFor="age" className="mb-1.5 block text-sm font-semibold text-gray-700">
          Age in months (optional)
        </label>
        <input
          id="age"
          type="number"
          min="0"
          max="240"
          value={ageMonths}
          onChange={(event) => setAgeMonths(event.target.value)}
          className={inputClass}
          placeholder="e.g. 4"
        />
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600"
        >
          {error}
        </motion.p>
      )}
      <motion.button
        type="submit"
        disabled={loading || !name}
        whileTap={{ scale: 0.97 }}
        className="mt-1 rounded-xl bg-primary-600 px-4 py-3.5 text-base font-semibold text-white shadow-md shadow-primary-600/25 hover:bg-primary-700 disabled:opacity-50 transition-all"
      >
        {loading ? "..." : "Start Training"}
      </motion.button>
    </motion.form>
  );
}
