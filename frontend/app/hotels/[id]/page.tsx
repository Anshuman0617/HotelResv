import { Suspense } from "react";

async function HotelDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-slate-500">Hotel #{id}</p>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        Hotel details
      </h1>
      <p className="text-slate-600">
        Hotel information and room types will be implemented in the next task.
      </p>
    </div>
  );
}

export default function HotelDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-12">
      <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-slate-200" />}>
        <HotelDetails params={params} />
      </Suspense>
      <section className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        Room types will appear here once the hotel details API is connected.
      </section>
    </main>
  );
}
