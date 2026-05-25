"use client";

import { useState } from "react";
import { switchDog } from "@/app/actions/switch-dog";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRightIcon } from "@/components/icons";
import { playTap } from "@/lib/sounds";

type Dog = {
  id: string;
  name: string;
};

export function DogSwitcher({
  activeDogId,
  dogs,
}: {
  activeDogId: string;
  dogs: Dog[];
}) {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const router = useRouter();

  if (dogs.length <= 1 && !open) {
    // Single dog, just show name as tappable to open menu (for add dog)
    return (
      <button
        onClick={() => { setOpen(true); playTap(); }}
        className="flex items-center gap-1 text-left"
      >
        <h1 className="text-2xl font-bold font-heading text-gray-900 dark:text-gray-50">
          {dogs[0]?.name ?? "Your Dog"}
        </h1>
        <ChevronRightIcon size={18} className="text-gray-400 dark:text-gray-500 rotate-90" />
      </button>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); playTap(); }}
        className="flex items-center gap-1 text-left"
      >
        <h1 className="text-2xl font-bold font-heading text-gray-900 dark:text-gray-50">
          {dogs.find((dog) => dog.id === activeDogId)?.name ?? "Your Dog"}
        </h1>
        <ChevronRightIcon size={18} className="text-gray-400 dark:text-gray-500 rotate-90" />
      </button>
    );
  }

  async function handleSwitch(dogId: string) {
    if (dogId === activeDogId) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    playTap();
    await switchDog(dogId);
    setSwitching(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <div>
      <button
        onClick={() => setOpen(false)}
        className="flex items-center gap-1 text-left mb-2"
      >
        <h1 className="text-2xl font-bold font-heading text-gray-900 dark:text-gray-50">
          {dogs.find((dog) => dog.id === activeDogId)?.name ?? "Your Dog"}
        </h1>
        <ChevronRightIcon size={18} className="text-gray-400 dark:text-gray-500 -rotate-90" />
      </button>
      <div className="rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-elevated shadow-lg overflow-hidden">
        {dogs.map((dog) => (
          <button
            key={dog.id}
            onClick={() => handleSwitch(dog.id)}
            disabled={switching}
            className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors ${
              dog.id === activeDogId
                ? "bg-primary-50 dark:bg-primary-950/20 text-primary-700 dark:text-primary-300"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-muted"
            } ${switching ? "opacity-50" : ""}`}
          >
            {dog.name}
            {dog.id === activeDogId && " ✓"}
          </button>
        ))}
        <Link
          href="/onboarding"
          className="block w-full px-4 py-3 text-left text-sm font-medium text-primary-600 dark:text-primary-400 border-t border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-muted transition-colors"
        >
          + Add Dog
        </Link>
      </div>
    </div>
  );
}
