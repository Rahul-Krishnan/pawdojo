"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [supabase] = useState(() => createClient());
  const sessionReady = useRef<Promise<unknown> | null>(null);

  // The recovery link lands here with the session tokens in the URL hash
  // (Supabase implicit flow). Establish the session from those tokens so
  // updateUser runs authenticated; otherwise it throws "Auth session missing!".
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (accessToken && refreshToken) {
      sessionReady.current = supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [supabase]);

  useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    // Wait for the recovery session to be established before updating.
    if (sessionReady.current) await sessionReady.current;
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    redirectTimer.current = setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 2000);
  }

  const inputClass = "w-full rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-muted px-4 py-3.5 text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary-500 focus:bg-white dark:focus:bg-dark-elevated focus:outline-none focus:ring-1 focus:ring-primary-500/20 transition-all";

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800/40 p-6 text-center"
      >
        <p className="text-lg font-bold font-heading text-gray-900 dark:text-gray-50">
          Password updated!
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Redirecting to dashboard...
        </p>
      </motion.div>
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-3"
    >
      <input
        type="password"
        placeholder="New password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
        minLength={6}
        className={inputClass}
      />
      <input
        type="password"
        placeholder="Confirm new password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        required
        minLength={6}
        className={inputClass}
      />
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
        disabled={loading}
        whileTap={{ scale: 0.97 }}
        className="mt-1 rounded-xl bg-primary-600 px-4 py-3.5 text-base font-semibold text-white shadow-md shadow-primary-600/25 hover:bg-primary-700 disabled:opacity-50 transition-all"
      >
        {loading ? "..." : "Update Password"}
      </motion.button>
    </motion.form>
  );
}
