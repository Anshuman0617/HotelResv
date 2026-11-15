"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import AuthShell from "@/components/AuthShell";

/* ------------------------------------------------------------------ */
/*  Register Page                                                       */
/* ------------------------------------------------------------------ */

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // Same rules as RegisterRequest in backend/app/schemas/auth.py.
    if (fullName.trim().length < 2) {
      setError("Full name must be at least 2 characters.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await register({
        full_name: fullName,
        email,
        password,
        phone: phone || undefined,
      });
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
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
      title="Create your account"
      subtitle="Book stays, track reservations and leave reviews."
      imageId={7}
    >

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {error && (
            <p role="alert" className="text-sm text-rose-700">
              {error}
            </p>
          )}

          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-sand-700">
              Full name
            </label>
            <input
              id="full_name"
              type="text"
              autoComplete="name"
              required
              minLength={2}
              maxLength={120}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
            />
          </div>

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
              autoComplete="new-password"
              required
              minLength={8}
              aria-describedby="password-hint"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
            <p id="password-hint" className="mt-1 text-xs text-sand-500">
              At least 8 characters.
            </p>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-sand-700">
              Phone{" "}
              <span className="text-sand-400">(optional)</span>
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              maxLength={25}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
            />
          </div>

          <button type="submit" disabled={submitting} className={primaryBtn}>
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-sm text-sand-600">
          Already registered?{" "}
          <Link href="/login" className="font-medium text-clay-700 hover:underline">
            Sign in
          </Link>
        </p>
    </AuthShell>
  );
}
