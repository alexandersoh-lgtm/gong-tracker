"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/workstreams", label: "Workstreams" },
  { href: "/launches", label: "Launch Tracker" },
  { href: "/pmo", label: "PMO" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="bg-slate-900 border-b border-slate-700/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 flex items-center h-14 gap-1">
        <Link href="/" className="text-white font-bold text-sm mr-6 flex items-center gap-2 shrink-0">
          <span className="text-blue-400">◈</span>
          <span className="hidden sm:block">Gong Implementation</span>
        </Link>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              pathname === l.href
                ? "bg-blue-600 text-white font-medium"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
