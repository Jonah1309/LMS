"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, BarChart2, LogOut, Tag } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

const links = [
  { href: "/instructor/dashboard", label: "Analytics", icon: BarChart2 },
  { href: "/instructor/courses", label: "My Courses", icon: BookOpen },
  { href: "/instructor/coupons", label: "Coupons", icon: Tag },
];

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-56 bg-white border-r border-slate-200 flex flex-col">
        <div className="h-16 flex items-center px-5 border-b border-slate-200">
          <Link href="/" className="text-lg font-bold text-indigo-700">Forgiven Generation Church</Link>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                pathname.startsWith(href)
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="px-3 pb-5">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-slate-500 hover:bg-slate-100 transition"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
