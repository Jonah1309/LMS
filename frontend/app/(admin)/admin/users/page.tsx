"use client";

import { useEffect, useState } from "react";
import { Search, Shield } from "lucide-react";
import api from "@/lib/api";

interface User {
  id: number;
  email: string;
  name: string | null;
  role: string;
  created_at: string;
  is_verified: boolean;
}

const ROLES = ["student", "instructor", "admin"];
const ROLE_STYLES: Record<string, string> = {
  admin: "bg-red-50 text-red-600",
  instructor: "bg-indigo-50 text-indigo-600",
  student: "bg-slate-100 text-slate-500",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  useEffect(() => {
    api.get("/api/v1/admin/users").then(({ data }) => setUsers(data)).finally(() => setLoading(false));
  }, []);

  async function changeRole(userId: number, newRole: string) {
    setUpdating(userId);
    try {
      await api.put(`/api/v1/admin/users/${userId}/role?role=${newRole}`);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    } finally {
      setUpdating(null);
    }
  }

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(query.toLowerCase()) ||
      (u.name ?? "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-sm text-slate-400 mt-0.5">{users.length} total</p>
        </div>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email or name…"
          className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-slate-200 animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 font-medium">
              <tr>
                <th className="px-5 py-3 text-left">User</th>
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-left">Role</th>
                <th className="px-5 py-3 text-left">Verified</th>
                <th className="px-5 py-3 text-left">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold">
                        {(u.name ?? u.email)[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-900">{u.name ?? "—"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{u.email}</td>
                  <td className="px-5 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      disabled={updating === u.id}
                      className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer focus:ring-2 focus:ring-indigo-400 ${ROLE_STYLES[u.role] ?? "bg-slate-100 text-slate-500"}`}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_verified ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"}`}>
                      {u.is_verified ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-400">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="px-5 py-12 text-center text-slate-400 text-sm">No users found.</div>
          )}
        </div>
      )}
    </div>
  );
}
