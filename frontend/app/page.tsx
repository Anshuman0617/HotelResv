import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import FeaturedHotels from "@/components/FeaturedHotels";
import { HERO_IMAGE } from "@/lib/images";

const DESTINATIONS = ["Mumbai", "Bengaluru", "Goa", "Jaipur", "Chennai", "Hyderabad", "New Delhi"];

const PROMISES = [
  {
    title: "Real-time availability",
    text: "Every search checks the rooms actually free for your dates, so what you see is what you can book.",
  },
  {
    title: "Your rate, locked in",
    text: "The nightly price is saved with your booking. If the hotel changes its rates later, yours stays put.",
  },
  {
    title: "Stays you can trust",
    text: "Reviews come only from guests who completed a stay, one per booking.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-sand-950/75 via-sand-950/40 to-transparent" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-transparent to-sand-50" />
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-24 pb-16 sm:pt-32">
          <div className="max-w-2xl text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-clay-200">
              Stays across India
            </p>
            <h1 className="mt-4 text-5xl font-medium leading-[1.05] sm:text-6xl">
              Find a stay worth <em className="text-clay-200">remembering.</em>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/85">
              Handpicked hotels from the beaches of Goa to the havelis of Jaipur, with live
              availability and honest reviews.
            </p>
          </div>
          <Suspense fallback={<div className="h-20 w-full animate-pulse rounded-2xl bg-white/70" />}>
            <SearchBar />
          </Suspense>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="mr-1 text-sand-600">Popular:</span>
            {DESTINATIONS.map((city) => (
              <Link
                key={city}
                href={`/hotels?q=${encodeURIComponent(city)}`}
                className="rounded-full border border-sand-300 bg-white/80 px-3.5 py-1.5 font-medium text-sand-700 backdrop-blur transition-colors hover:border-clay-400 hover:text-clay-700"
              >
                {city}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured stays */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-clay-600">
              Featured
            </p>
            <h2 className="mt-2 text-3xl font-medium text-sand-900 sm:text-4xl">
              Places guests love
            </h2>
          </div>
          <Link
            href="/hotels"
            className="hidden shrink-0 rounded-full border border-sand-300 px-4 py-2 text-sm font-semibold text-sand-800 transition-colors hover:border-sand-900 sm:inline-block"
          >
            See all stays →
          </Link>
        </div>
        <FeaturedHotels limit={6} />
      </section>

      {/* Promises */}
      <section className="border-t border-sand-200 bg-sand-100/60">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 sm:grid-cols-3">
          {PROMISES.map((item, i) => (
            <article key={item.title} className="flex gap-4">
              <span className="font-display text-3xl font-medium text-clay-500">0{i + 1}</span>
              <div>
                <h3 className="font-display text-xl font-medium text-sand-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-sand-600">{item.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-sand-200">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-sand-500">
          <span className="font-display text-base text-sand-700">HotelResv</span>
          <span>A DBMS course project · Photos from Unsplash</span>
        </div>
      </footer>
    </main>
  );
}
