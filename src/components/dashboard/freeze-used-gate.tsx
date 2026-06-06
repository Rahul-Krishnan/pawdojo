"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { detectFreezeUsed } from "@/lib/gamification/streaks";
import { FreezeUsedNotification } from "./freeze-used-notification";

function storageKey(userId: string): string {
  return `pawdojo-freeze-seen-${userId}`;
}

function readLastSeen(userId: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw === null) return null;
    const parsed = Number(JSON.parse(raw));
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeLastSeen(userId: string, value: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode / quota): fail open without notifying
    // again endlessly is acceptable — the worst case is the notification not
    // persisting its acknowledgement.
  }
}

// Client-only gate that decides whether to show the "Streak freeze used"
// notification exactly once per consumption. Detection compares the running
// `freezeUsedTotal` (from streak_events) against a per-user marker persisted in
// localStorage. The marker is advanced to the live total as soon as the
// notification is shown, so it never replays on subsequent loads.
export function FreezeUsedGate({
  userId,
  freezeUsedTotal,
  freezeRemaining,
}: {
  userId: string;
  freezeUsedTotal: number;
  freezeRemaining: number;
}) {
  const [show, setShow] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const lastSeen = readLastSeen(userId);
    const detection = detectFreezeUsed(freezeUsedTotal, lastSeen);

    if (detection.shouldNotify) {
      setCount(detection.newlyConsumed);
      setShow(true);
    }

    // Advance the marker immediately so a refresh before dismissal does not
    // re-trigger the notification. This includes the first-load case where
    // shouldNotify is false but the stored marker is absent or stale.
    if (
      lastSeen === null ||
      detection.acknowledgedCount !== Math.max(0, lastSeen)
    ) {
      writeLastSeen(userId, detection.acknowledgedCount);
    }
  }, [userId, freezeUsedTotal]);

  return (
    <AnimatePresence>
      {show && (
        <FreezeUsedNotification
          count={count}
          freezeRemaining={freezeRemaining}
          onClose={() => setShow(false)}
        />
      )}
    </AnimatePresence>
  );
}
