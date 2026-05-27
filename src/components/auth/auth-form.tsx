"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

type Mode = "login" | "signup" | "forgot";

export function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    const supabase = createClient();

    if (mode === "forgot") {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) {
        setError(resetError.message);
      } else {
        setInfo("Check your email for a password reset link.");
      }
      setLoading(false);
      return;
    }

    const action = mode === "signup"
      ? supabase.auth.signUp({ email, password })
      : supabase.auth.signInWithPassword({ email, password });

    const { error: authError } = await action;

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (mode === "signup") {
      setInfo("Check your email for a confirmation link.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  const inputClass = "rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-muted px-4 py-3.5 text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary-500 focus:bg-white dark:focus:bg-dark-elevated focus:outline-none focus:ring-1 focus:ring-primary-500/20 transition-all";

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-3"
    >
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
        className={inputClass}
      />
      {mode !== "forgot" && (
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={6}
          className={inputClass}
        />
      )}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </motion.p>
      )}
      {info && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-primary-50 dark:bg-primary-950/30 px-3 py-2 text-sm text-primary-700 dark:text-primary-300"
        >
          {info}
        </motion.p>
      )}
      <motion.button
        type="submit"
        disabled={loading}
        whileTap={{ scale: 0.97 }}
        className="mt-1 rounded-xl bg-primary-600 px-4 py-3.5 text-base font-semibold text-white shadow-md shadow-primary-600/25 hover:bg-primary-700 disabled:opacity-50 transition-all"
      >
        {loading
          ? "..."
          : mode === "forgot"
            ? "Send Reset Link"
            : mode === "signup"
              ? "Sign Up"
              : "Log In"}
      </motion.button>

      {mode === "login" && (
        <button
          type="button"
          onClick={() => { setMode("forgot"); setError(null); setInfo(null); }}
          className="text-sm text-gray-400 dark:text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        >
          Forgot password?
        </button>
      )}

      <div className="mt-1 flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200 dark:bg-dark-border" />
        <span className="text-xs text-gray-400 dark:text-gray-500">or</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-dark-border" />
      </div>

      {mode === "login" && (
        <button
          type="button"
          onClick={() => { setMode("signup"); setError(null); setInfo(null); }}
          className="rounded-xl border-2 border-primary-500 dark:border-primary-600 px-4 py-3 text-base font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/20 transition-all"
        >
          Create an account
        </button>
      )}
      {mode === "signup" && (
        <button
          type="button"
          onClick={() => { setMode("login"); setError(null); setInfo(null); }}
          className="rounded-xl border-2 border-primary-500 dark:border-primary-600 px-4 py-3 text-base font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/20 transition-all"
        >
          Already have an account? Log in
        </button>
      )}
      {mode === "forgot" && (
        <button
          type="button"
          onClick={() => { setMode("login"); setError(null); setInfo(null); }}
          className="rounded-xl border-2 border-primary-500 dark:border-primary-600 px-4 py-3 text-base font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/20 transition-all"
        >
          Back to login
        </button>
      )}
    </motion.form>
  );
}
