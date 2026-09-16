"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, BookOpen, BarChart2, Tag } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { useRouter } from "next/navigation";

const NAV = [
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/courses", icon: BookOpen, label: "Courses" },
  { href: "/admin/analytics", icon: BarChart2, label: "Analytics" },
  { href: "/admin/coupons", icon: Tag, label: "Coupons" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { clearAuth } = useAuthStore();
  const router = useRouter();

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-56 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-200">
          <Link href="/" className="text-lg font-bold text-indigo-700">Forgiven Generation Church</Link>
          <p className="text-xs text-slate-400 mt-0.5">Admin Panel</p>
        </div>
        <nav className="flex-1 py-3 space-y-0.5 px-2">
          {NAV.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                pathname.startsWith(href) ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-slate-500 hover:text-slate-800 px-3 py-2 rounded-lg hover:bg-slate-50 transition"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
