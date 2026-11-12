"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/manager", label: "Dashboard" },
  { href: "/manager/hotels", label: "Hotels" },
  { href: "/manager/room-types", label: "Room Types" },
  { href: "/manager/rooms", label: "Rooms" },
  { href: "/manager/reservations", label: "Reservations" },
  { href: "/manager/payments", label: "Payments" },
  { href: "/manager/reviews", label: "Reviews" },
  { href: "/manager/reports", label: "Reports" },
];

function isActive(pathname: string, href: string) {
  if (href === "/manager") {
    return pathname === "/manager";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar({
  open,
  onNavigate,
}: {
  open: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      <button
        type="button"
        aria-label="Close manager menu"
        className={`fixed inset-0 z-30 bg-slate-900/40 md:hidden ${open ? "block" : "hidden"}`}
        onClick={onNavigate}
      />
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform md:static md:top-auto md:bottom-auto md:z-auto md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
            Manager
          </p>
          <p className="mt-1 text-sm text-slate-500">Hotel operations</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {links.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
