import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-16">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          Create an account
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          The registration form will be connected to{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
            POST /api/auth/register
          </code>{" "}
          in the next task.
        </p>
        <p className="mt-4 text-sm text-slate-600">
          Already registered?{" "}
          <Link href="/login" className="font-medium text-indigo-700 hover:underline">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
