"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Tag } from "lucide-react";
import api from "@/lib/api";

interface Coupon {
  id: number;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  course_id: number | null;
  is_active: boolean;
  created_at: string;
}

const EMPTY = {
  code: "",
  discount_type: "percent" as const,
  discount_value: "",
  max_uses: "",
  expires_at: "",
  course_id: "",
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    try {
      const { data } = await api.get("/api/v1/coupons");
      setCoupons(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      await api.post("/api/v1/coupons", {
        code: form.code,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        expires_at: form.expires_at || null,
        course_id: form.course_id ? Number(form.course_id) : null,
      });
      setShowForm(false);
      setForm(EMPTY);
      load();
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? "Error creating coupon.");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(id: number) {
    if (!confirm("Deactivate this coupon?")) return;
    await api.delete(`/api/v1/coupons/${id}`);
    load();
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Coupons</h1>
          <p className="text-slate-500 text-sm mt-0.5">Platform-wide and course-specific discount codes</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setErr(""); }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
        >
          <Plus className="w-4 h-4" /> New Coupon
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={create}
          className="bg-white border border-slate-200 rounded-xl p-6 mb-6 space-y-4"
        >
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-500" /> Create Coupon
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Code *</label>
              <input
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="SAVE20"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Discount type *</label>
              <select
                value={form.discount_type}
                onChange={(e) => setForm({ ...form, discount_type: e.target.value as "percent" | "fixed" })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed amount</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Value * {form.discount_type === "percent" ? "(%)" : "(amount)"}
              </label>
              <input
                required
                type="number"
                min={0.01}
                max={form.discount_type === "percent" ? 100 : undefined}
                step="0.01"
                value={form.discount_value}
                onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Max uses (leave blank = unlimited)</label>
              <input
                type="number"
                min={1}
                value={form.max_uses}
                onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                placeholder="e.g. 100"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Expiry date (optional)</label>
              <input
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Course ID (leave blank = platform-wide)</label>
              <input
                type="number"
                min={1}
                value={form.course_id}
                onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                placeholder="e.g. 5"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {saving ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setErr(""); }}
              className="px-5 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : coupons.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No coupons yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Code", "Discount", "Uses", "Expires", "Scope", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coupons.map((c) => (
                <tr key={c.id} className={c.is_active ? "" : "opacity-50"}>
                  <td className="px-4 py-3 font-mono font-semibold text-slate-800">{c.code}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.discount_type === "percent" ? `${c.discount_value}%` : `$${c.discount_value}`}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.uses_count}{c.max_uses ? ` / ${c.max_uses}` : ""}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {c.course_id ? `Course #${c.course_id}` : "Platform-wide"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {c.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.is_active && (
                      <button
                        onClick={() => deactivate(c.id)}
                        className="text-red-400 hover:text-red-600 transition"
                        title="Deactivate"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
