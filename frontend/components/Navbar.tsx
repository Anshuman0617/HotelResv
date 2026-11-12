import Link from "next/link";

const links = [
  { href: "/hotels", label: "Hotels" },
  { href: "/bookings", label: "My Bookings" },
  { href: "/manager", label: "Manager" },
];

export default function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold text-indigo-700">
          HotelResv
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-slate-600 transition-colors hover:text-indigo-700"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 transition-colors hover:border-indigo-600 hover:text-indigo-700"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-white transition-colors hover:bg-indigo-700"
          >
            Register
          </Link>
        </div>
      </nav>
    </header>
  );
}
