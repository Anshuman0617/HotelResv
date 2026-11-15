"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import AuthShell from "@/components/AuthShell";

/* ------------------------------------------------------------------ */
/*  Login Page                                                          */
/* ------------------------------------------------------------------ */

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      // Return to the page that sent the user here (e.g. /manager), but only
      // to a path on this site.
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }


  const inputClass =
    "mt-1.5 w-full rounded-xl border border-sand-300 bg-white px-4 py-3 text-sm text-sand-900 outline-none transition focus:border-clay-500 focus:ring-4 focus:ring-clay-100";
  const primaryBtn =
    "w-full rounded-full bg-clay-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-clay-700 disabled:opacity-50";

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your stays and bookings."
      imageId={3}
    >

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {error && (
            <p role="alert" className="text-sm text-rose-700">
              {error}
            </p>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-sand-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-sand-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          <button type="submit" disabled={submitting} className={primaryBtn}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-sm text-sand-600">
          Need an account?{" "}
          <Link href="/register" className="font-medium text-clay-700 hover:underline">
            Register
          </Link>
        </p>
    </AuthShell>
  );
}
