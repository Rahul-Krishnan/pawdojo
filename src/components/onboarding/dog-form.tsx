"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function DogForm({ userId }: { userId: string }) {
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [ageMonths, setAgeMonths] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { error: insertError } = await supabase.from("dogs").insert({
      user_id: userId,
      name,
      breed: breed || null,
      age_months: ageMonths ? parseInt(ageMonths, 10) : null,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
          Dog&apos;s name *
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="breed" className="mb-1 block text-sm font-medium text-gray-700">
          Breed (optional)
        </label>
        <input
          id="breed"
          type="text"
          value={breed}
          onChange={(event) => setBreed(event.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="age" className="mb-1 block text-sm font-medium text-gray-700">
          Age in months (optional)
        </label>
        <input
          id="age"
          type="number"
          min="0"
          max="240"
          value={ageMonths}
          onChange={(event) => setAgeMonths(event.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading || !name}
        className="rounded-lg bg-blue-600 px-4 py-3 text-base font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "..." : "Start Training"}
      </button>
    </form>
  );
}
