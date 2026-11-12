import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-16">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
        <p className="mt-2 text-sm text-slate-600">
          The login form will be connected to{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
            POST /api/auth/login
          </code>{" "}
          in the next task.
        </p>
        <p className="mt-4 text-sm text-slate-600">
          Need an account?{" "}
          <Link href="/register" className="font-medium text-indigo-700 hover:underline">
            Register
          </Link>
        </p>
      </section>
    </main>
  );
}
