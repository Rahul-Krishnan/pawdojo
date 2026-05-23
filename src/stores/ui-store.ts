"use client";

import { create } from "zustand";
import { setMuted } from "@/lib/sounds";

type Theme = "light" | "dark" | "system";

interface UIStore {
  soundEnabled: boolean;
  theme: Theme;
  toggleSound: () => void;
  setTheme: (theme: Theme) => void;
}

function getStoredValue<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(key);
    return stored !== null ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export const useUIStore = create<UIStore>((set) => ({
  soundEnabled: getStoredValue("goodboy-sound", true),
  theme: getStoredValue<Theme>("goodboy-theme", "system"),

  toggleSound: () =>
    set((state) => {
      const next = !state.soundEnabled;
      setMuted(!next);
      if (typeof window !== "undefined") {
        localStorage.setItem("goodboy-sound", JSON.stringify(next));
      }
      return { soundEnabled: next };
    }),

  setTheme: (theme: Theme) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("goodboy-theme", JSON.stringify(theme));
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      if (theme === "system") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.classList.add(prefersDark ? "dark" : "light");
      } else {
        root.classList.add(theme);
      }
    }
    set({ theme });
  },
}));
