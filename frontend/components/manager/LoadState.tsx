/** Loading, error and empty states shared by the manager pages. */

export function LoadingNotice({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      className="rounded-xl border border-sand-200 bg-white px-5 py-8 text-center text-sm text-sand-500 shadow-sm"
    >
      {label}
    </div>
  );
}

export function ErrorNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between"
    >
      <p>{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="w-fit rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
