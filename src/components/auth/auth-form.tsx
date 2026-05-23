"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

export function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const action = isSignUp
      ? supabase.auth.signUp({ email, password })
      : supabase.auth.signInWithPassword({ email, password });

    const { error: authError } = await action;

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (isSignUp) {
      setInfo("Check your email for a confirmation link.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
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
        type="email"
        placeholder="Email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
        className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-base focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500/20 transition-all"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
        minLength={6}
        className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-base focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500/20 transition-all"
      />
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600"
        >
          {error}
        </motion.p>
      )}
      {info && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary-700"
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
        {loading ? "..." : isSignUp ? "Sign Up" : "Log In"}
      </motion.button>
      <button
        type="button"
        onClick={() => setIsSignUp(!isSignUp)}
        className="text-sm text-gray-400 hover:text-primary-600 transition-colors"
      >
        {isSignUp ? "Already have an account? Log in" : "Need an account? Sign up"}
      </button>
    </motion.form>
  );
}
