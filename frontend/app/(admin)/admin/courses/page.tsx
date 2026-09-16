"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import api from "@/lib/api";

interface Course {
  id: number;
  title: string;
  slug: string;
  status: string;
  price_usd: number;
  price_inr: number;
  instructor_id: number;
}

const STATUS_OPTIONS = ["draft", "published", "archived"];
const STATUS_STYLES: Record<string, string> = {
  published: "bg-green-50 text-green-600",
  draft: "bg-slate-100 text-slate-500",
  archived: "bg-red-50 text-red-500",
};

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  useEffect(() => {
    api.get("/api/v1/admin/courses").then(({ data }) => setCourses(data)).finally(() => setLoading(false));
  }, []);

  async function changeStatus(courseId: number, newStatus: string) {
    setUpdating(courseId);
    try {
      await api.put(`/api/v1/admin/courses/${courseId}/status?status=${newStatus}`);
      setCourses((prev) => prev.map((c) => c.id === courseId ? { ...c, status: newStatus } : c));
    } finally {
      setUpdating(null);
    }
  }

  const filtered = courses.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.slug.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Courses</h1>
          <p className="text-sm text-slate-400 mt-0.5">{courses.length} total</p>
        </div>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search courses…"
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
                <th className="px-5 py-3 text-left">Title</th>
                <th className="px-5 py-3 text-left">Slug</th>
                <th className="px-5 py-3 text-right">Price (USD)</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition">
                  <td className="px-5 py-3 font-medium text-slate-900 max-w-xs truncate">{c.title}</td>
                  <td className="px-5 py-3 text-slate-400 font-mono text-xs">{c.slug}</td>
                  <td className="px-5 py-3 text-right text-slate-600">
                    {c.price_usd === 0 ? "Free" : `$${c.price_usd}`}
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={c.status}
                      onChange={(e) => changeStatus(c.id, e.target.value)}
                      disabled={updating === c.id}
                      className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer focus:ring-2 focus:ring-indigo-400 ${STATUS_STYLES[c.status] ?? "bg-slate-100 text-slate-500"}`}
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/courses/${c.slug}`}
                      className="text-xs text-indigo-600 hover:underline"
                      target="_blank"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="px-5 py-12 text-center text-slate-400 text-sm">No courses found.</div>
          )}
        </div>
      )}
    </div>
  );
}
