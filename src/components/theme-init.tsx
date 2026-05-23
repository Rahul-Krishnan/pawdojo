"use client";

import { useEffect } from "react";
import { useUIStore } from "@/stores/ui-store";
import { setMuted } from "@/lib/sounds";
import { setHapticEnabled } from "@/lib/haptics";

export function ThemeInit() {
  const { theme, soundEnabled } = useUIStore();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (theme === "system") {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      root.classList.add(prefersDark ? "dark" : "light");
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  useEffect(() => {
    setMuted(!soundEnabled);
    setHapticEnabled(soundEnabled);
  }, [soundEnabled]);

  return null;
}
