import Link from "next/link";
import SearchBar from "@/components/SearchBar";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-16">
      <section className="flex flex-col gap-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">
          Hotel Booking System
        </p>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Find and book the right stay, in one place.
        </h1>
        <p className="max-w-2xl text-lg text-slate-600">
          Browse hotels, compare room types, and manage your reservations.
          Hotel managers can track bookings, rooms, payments, and reviews from a
          single dashboard.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/hotels"
            className="rounded-md bg-indigo-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Browse hotels
          </Link>
          <Link
            href="/register"
            className="rounded-md border border-slate-300 px-5 py-2.5 font-medium text-slate-700 transition-colors hover:border-indigo-600 hover:text-indigo-700"
          >
            Create an account
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-slate-900">
          Search by destination and dates
        </h2>
        <SearchBar />
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "Browse and compare",
            text: "Search active hotels by city and compare room types and nightly rates.",
          },
          {
            title: "Book with confidence",
            text: "Availability is checked for your dates before a booking is confirmed.",
          },
          {
            title: "Manage everything",
            text: "View booking history, cancel eligible stays, and leave reviews after checkout.",
          },
        ].map((item) => (
          <article
            key={item.title}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h3 className="font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{item.text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
