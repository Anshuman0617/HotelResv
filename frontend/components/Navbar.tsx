"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

type NavItem = { href: string; label: string };

const customerLinks: NavItem[] = [
  { href: "/hotels", label: "Stays" },
  { href: "/bookings", label: "My bookings" },
];
// Only for owners, managers and staff of at least one hotel.
const managerLink: NavItem = { href: "/manager", label: "Manage" };

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function NavLink({
  href,
  label,
  active,
  compact = false,
}: {
  href: string;
  label: string;
  active: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
        compact ? "inline-block" : "hidden sm:inline-block"
      } ${
        active
          ? "bg-sand-200/70 text-sand-900"
          : "text-sand-600 hover:bg-sand-100 hover:text-sand-900"
      }`}
    >
      {label}
    </Link>
  );
}

/** Reads the URL to highlight the current section, so it renders inside Suspense. */
function ActiveNavLinks({ links, compact = false }: { links: NavItem[]; compact?: boolean }) {
  const pathname = usePathname();
  return links.map((link) => (
    <NavLink
      key={link.href}
      {...link}
      compact={compact}
      active={pathname === link.href || pathname.startsWith(`${link.href}/`)}
    />
  ));
}

export default function Navbar() {
  const { user, loading, managesHotels, logout } = useAuth();
  const links = managesHotels ? [...customerLinks, managerLink] : customerLinks;

  return (
    <header className="sticky top-0 z-50 border-b border-sand-200/80 bg-sand-50/90 backdrop-blur">
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2">
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-full bg-clay-600 font-display text-lg leading-none text-white"
          >
            H
          </span>
          <span className="font-display text-xl font-semibold tracking-tight text-sand-900">
            HotelResv
          </span>
        </Link>

        <div className="flex items-center gap-1 text-sm sm:gap-2">
          <Suspense
            fallback={links.map((link) => (
              <NavLink key={link.href} {...link} active={false} />
            ))}
          >
            <ActiveNavLinks links={links} />
          </Suspense>

          <span aria-hidden className="mx-1 hidden h-5 w-px bg-sand-200 sm:block" />

          {loading ? (
            <div className="h-9 w-28 animate-pulse rounded-full bg-sand-100" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <span
                className="grid h-9 w-9 place-items-center rounded-full bg-lagoon-600 text-xs font-semibold text-white"
                title={user.full_name}
              >
                {initials(user.full_name)}
              </span>
              <button
                onClick={logout}
                className="rounded-full px-3 py-1.5 font-medium text-sand-600 transition-colors hover:bg-sand-100 hover:text-sand-900"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-full px-3 py-1.5 font-medium text-sand-700 transition-colors hover:bg-sand-100"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-sand-900 px-4 py-1.5 font-medium text-sand-50 transition-colors hover:bg-clay-700"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </nav>
      {/* Phones: the section links get their own row under the bar. */}
      <div className="flex gap-1 overflow-x-auto px-3 pb-2 text-sm sm:hidden">
        <Suspense
          fallback={links.map((link) => (
            <NavLink key={link.href} {...link} active={false} compact />
          ))}
        >
          <ActiveNavLinks links={links} compact />
        </Suspense>
      </div>
    </header>
  );
}
