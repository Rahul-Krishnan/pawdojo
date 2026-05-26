"use client";

import { switchDog } from "@/app/actions/switch-dog";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { playTap } from "@/lib/sounds";

export function ActivateDogButton({
  dogId,
  isActive,
  children,
}: {
  dogId: string;
  isActive: boolean;
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (isActive) {
    return <>{children}</>;
  }

  async function handleActivate() {
    setLoading(true);
    playTap();
    await switchDog(dogId);
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={handleActivate}
      disabled={loading}
      className={`w-full text-left transition-opacity ${loading ? "opacity-50" : ""}`}
    >
      {children}
      <p className="mt-1 text-xs font-medium text-primary-600 dark:text-primary-400">
        {loading ? "Switching..." : "Tap to make active"}
      </p>
    </button>
  );
}
