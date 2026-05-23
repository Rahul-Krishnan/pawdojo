"use client";

import { useUIStore } from "@/stores/ui-store";
import { playTap } from "@/lib/sounds";

export function SettingsPanel() {
  const { soundEnabled, toggleSound, theme, setTheme } = useUIStore();

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
        Settings
      </h2>

      <div className="flex items-center justify-between rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-elevated p-4">
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Sound effects</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Chimes, dings, and celebration sounds</p>
        </div>
        <button
          onClick={() => {
            toggleSound();
            if (!soundEnabled) playTap();
          }}
          role="switch"
          aria-checked={soundEnabled}
          aria-label="Toggle sound effects"
          className={`relative h-7 w-12 rounded-full transition-colors ${
            soundEnabled ? "bg-primary-500" : "bg-gray-300 dark:bg-gray-600"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
              soundEnabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-elevated p-4">
        <p className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">Appearance</p>
        <div className="flex gap-2">
          {(["light", "dark", "system"] as const).map((option) => (
            <button
              key={option}
              onClick={() => { setTheme(option); playTap(); }}
              aria-pressed={theme === option}
              className={`flex-1 rounded-xl py-2.5 text-xs font-semibold capitalize transition-all ${
                theme === option
                  ? "bg-primary-600 text-white shadow-md"
                  : "bg-gray-100 dark:bg-dark-muted text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-border"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
