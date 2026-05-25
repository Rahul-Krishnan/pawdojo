"use client";

import { useState } from "react";
import { createDog } from "@/app/actions/create-dog";
import { motion } from "motion/react";

export function DogForm() {
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [birthday, setBirthday] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const result = await createDog({
      name,
      breed: breed || null,
      birthday: birthday || null,
    });

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-muted px-4 py-3.5 text-base text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:bg-white dark:focus:bg-dark-elevated focus:outline-none focus:ring-1 focus:ring-primary-500/20 transition-all";

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-4"
    >
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
          Dog&apos;s name *
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          className={inputClass}
          placeholder="eg Biscuit"
        />
      </div>
      <div>
        <label htmlFor="breed" className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
          Breed (optional)
        </label>
        <input
          id="breed"
          type="text"
          value={breed}
          onChange={(event) => setBreed(event.target.value)}
          className={inputClass}
          placeholder="eg Golden Retriever"
        />
      </div>
      <div>
        <label htmlFor="birthday" className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
          Birthday (optional)
        </label>
        <input
          id="birthday"
          type="date"
          max={new Date().toISOString().split("T")[0]}
          value={birthday}
          onChange={(event) => setBirthday(event.target.value)}
          className={inputClass}
        />
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </motion.p>
      )}
      <motion.button
        type="submit"
        disabled={loading || !name}
        whileTap={{ scale: 0.97 }}
        className="mt-1 rounded-xl bg-success-600 px-4 py-3.5 text-base font-semibold text-white shadow-md shadow-success-600/25 hover:bg-success-700 disabled:opacity-50 transition-all"
      >
        {loading ? "..." : "Start Training"}
      </motion.button>
    </motion.form>
  );
}
