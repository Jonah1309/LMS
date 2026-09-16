"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, X, CheckCheck } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import api from "@/lib/api";

interface Notif {
  id: number;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function fetchCount() {
    api.get("/api/v1/notifications/unread-count").then(({ data }) => setCount(data.count)).catch(() => {});
  }

  function openPanel() {
    setOpen(true);
    api.get("/api/v1/notifications").then(({ data }) => setNotifs(data)).catch(() => {});
  }

  async function markAll() {
    await api.put("/api/v1/notifications/read-all").catch(() => {});
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    setCount(0);
  }

  async function markOne(id: number) {
    await api.put(`/api/v1/notifications/${id}/read`).catch(() => {});
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setCount((c) => Math.max(0, c - 1));
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={open ? () => setOpen(false) : openPanel}
        className="relative p-1.5 text-white/70 hover:text-white transition"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {count > 0 && (
                <button onClick={markAll} className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">No notifications</div>
            ) : (
              notifs.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read && markOne(n.id)}
                  className={`px-4 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition ${
                    n.read ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />}
                    <div className={n.read ? "pl-3.5" : ""}>
                      <p className="text-sm text-slate-800">{n.message}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileDropdown({ user, logout }: { user: { name?: string; email?: string; role?: string }; logout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initial = (user.name?.[0] ?? user.email?.[0] ?? "?").toUpperCase();
  const dashboardHref =
    user.role === "instructor" ? "/instructor/dashboard" : user.role === "admin" ? "/admin/users" : "/dashboard";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-8 h-8 rounded-full bg-brand-600 hover:bg-brand-500 text-white flex items-center justify-center text-sm font-bold transition"
        aria-label="Profile menu"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          {/* User info header */}
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900 truncate">{user.name ?? "Account"}</p>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          </div>

          {/* Links */}
          <div className="py-1">
            <Link
              href={dashboardHref}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
            >
              Dashboard
            </Link>
            {user.role === "student" && (
              <Link
                href="/billing"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
              >
                Payment History
              </Link>
            )}
          </div>

          {/* Sign out */}
          <div className="border-t border-slate-100 py-1">
            <button
              onClick={() => { setOpen(false); logout(); }}
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-brand-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo + nav links grouped on left */}
        <div className="flex items-center gap-0">
          <Link href="/" className="flex items-center gap-3 pr-5">
            <div className="w-8 h-8 bg-gold-500 rounded-full flex items-center justify-center font-bold text-brand-900 text-sm select-none">
              ✝
            </div>
            <span className="font-bold text-lg leading-none">Forgiven Generation Church</span>
          </Link>

          {/* Divider */}
          <div className="hidden md:block w-px h-6 bg-white/20 mx-1" />

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1 pl-4">
            <Link href="/courses" className="text-white font-medium px-4 py-1.5 rounded-full hover:bg-white/10 transition text-sm">
              Courses
            </Link>
            {user && (
              <Link
                href={user.role === "instructor" ? "/instructor/dashboard" : user.role === "admin" ? "/admin/users" : "/dashboard"}
                className="text-white font-medium px-4 py-1.5 rounded-full hover:bg-white/10 transition text-sm"
              >
                Dashboard
              </Link>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <NotificationBell />
              <ProfileDropdown user={user} logout={logout} />
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-white/70 hover:text-white transition px-4 py-2 rounded">
                Sign In
              </Link>
              <Link
                href="/register"
                className="text-sm bg-gold-500 text-brand-900 font-semibold px-4 py-2 rounded hover:bg-gold-400 transition"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
