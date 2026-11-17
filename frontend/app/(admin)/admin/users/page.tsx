"use client";

import { useEffect, useState } from "react";
import { Search, Shield, UserPlus, UserX, UserCheck, X } from "lucide-react";
import api from "@/lib/api";

interface User {
  id: number;
  email: string;
  name: string | null;
  role: string;
  created_at: string;
  is_verified: boolean;
  is_active: boolean;
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
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "student", password: "" });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

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

  async function verifyUser(userId: number) {
    setUpdating(userId);
    try {
      const { data } = await api.put(`/api/v1/admin/users/${userId}/verify`);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_verified: data.is_verified } : u));
    } finally {
      setUpdating(null);
    }
  }

  async function toggleActive(userId: number, currentlyActive: boolean) {
    setUpdating(userId);
    try {
      const endpoint = currentlyActive ? "deactivate" : "reactivate";
      const { data } = await api.put(`/api/v1/admin/users/${userId}/${endpoint}`);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_active: data.is_active } : u));
    } finally {
      setUpdating(null);
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setFormError("");
    try {
      const { data } = await api.post("/api/v1/admin/users", form);
      setUsers((prev) => [data, ...prev]);
      setShowModal(false);
      setForm({ name: "", email: "", role: "student", password: "" });
    } catch (err: any) {
      setFormError(err?.response?.data?.detail ?? "Failed to create user");
    } finally {
      setCreating(false);
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
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
        >
          <UserPlus className="w-4 h-4" aria-hidden="true" />
          Add User
        </button>
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
                <th className="px-5 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  className={`transition ${u.is_active ? "hover:bg-slate-50" : "bg-slate-50 opacity-60"}`}
                >
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
                    {u.is_verified ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600">Yes</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => verifyUser(u.id)}
                        disabled={updating === u.id}
                        title="Click to verify this user"
                        className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 hover:bg-amber-100 disabled:opacity-50 transition"
                      >
                        <Shield className="w-3 h-3" aria-hidden="true" />
                        Verify
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-400">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(u.id, u.is_active)}
                      disabled={updating === u.id}
                      title={u.is_active ? "Deactivate user" : "Reactivate user"}
                      aria-label={u.is_active ? `Deactivate ${u.name ?? u.email}` : `Reactivate ${u.name ?? u.email}`}
                      className={`transition disabled:opacity-50 ${u.is_active ? "text-slate-300 hover:text-red-500" : "text-slate-300 hover:text-green-500"}`}
                    >
                      {u.is_active
                        ? <UserX className="w-4 h-4" aria-hidden="true" />
                        : <UserCheck className="w-4 h-4" aria-hidden="true" />}
                    </button>
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

      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">Add User</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={createUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  required
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {formError && <p className="text-red-500 text-sm">{formError}</p>}
              <button
                type="submit"
                disabled={creating}
                className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {creating ? "Creating…" : "Create User"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
