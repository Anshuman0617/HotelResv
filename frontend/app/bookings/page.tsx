export default function BookingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          My bookings
        </h1>
        <p className="text-slate-600">
          Booking history will be implemented in the next task.
        </p>
      </div>
      <section className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        Sign in to view your bookings.
      </section>
    </main>
  );
}
