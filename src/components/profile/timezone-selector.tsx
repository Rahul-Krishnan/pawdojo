"use client";

import { useState } from "react";
import { updateTimezone } from "@/app/actions/update-profile";
import { useRouter } from "next/navigation";
import { playSuccess } from "@/lib/sounds";

const commonTimezones = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
  "UTC",
];

export function TimezoneSelector({ currentTimezone }: { currentTimezone: string }) {
  const [editing, setEditing] = useState(false);
  const [timezone, setTimezone] = useState(currentTimezone);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
      >
        Change
      </button>
    );
  }

  async function handleSave() {
    setLoading(true);
    const result = await updateTimezone(timezone);
    if (result.success) {
      playSuccess();
      setEditing(false);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <select
        value={timezone}
        onChange={(event) => setTimezone(event.target.value)}
        className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none"
      >
        {commonTimezones.map((tz) => (
          <option key={tz} value={tz}>
            {tz.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      <button
        onClick={handleSave}
        disabled={loading}
        className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "..." : "Save"}
      </button>
      <button
        onClick={() => {
          setEditing(false);
          setTimezone(currentTimezone);
        }}
        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
