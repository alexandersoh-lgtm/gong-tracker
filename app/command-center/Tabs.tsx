"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/command-center", label: "Overview" },
  { href: "/command-center/sprints", label: "Sprints" },
  { href: "/command-center/timeline", label: "Timeline" },
  { href: "/command-center/owners", label: "Owners" },
  { href: "/command-center/risks", label: "Risks" },
];

export default function Tabs() {
  const path = usePathname();
  return (
    <div className="cctabs">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={path === t.href ? "active" : ""}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}
