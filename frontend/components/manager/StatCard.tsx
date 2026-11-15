export default function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <article className="rounded-2xl border border-sand-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sand-500">{label}</p>
      <p
        className="mt-3 font-display text-3xl font-medium tracking-tight text-sand-900"
        suppressHydrationWarning
      >
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-sand-500">{hint}</p> : null}
    </article>
  );
}
