import type { ReactNode } from "react";

export default function ManagerModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-sand-950/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="manager-modal-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-sand-200 px-5 py-4">
          <h2
            id="manager-modal-title"
            className="text-lg font-semibold text-sand-900"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-md px-2 py-1 text-sand-500 hover:bg-sand-100 hover:text-sand-800"
          >
            Close
          </button>
        </div>
        <div className="p-5">{children}</div>
      </section>
    </div>
  );
}
