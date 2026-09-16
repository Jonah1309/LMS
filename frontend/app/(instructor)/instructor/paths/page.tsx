"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, BookOpen } from "lucide-react";
import api from "@/lib/api";

interface LearningPath {
  id: number;
  title: string;
  description: string | null;
  slug: string;
  price_usd: number;
  price_inr: number;
  course_count: number;
}

export default function InstructorPathsPage() {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", price_usd: 0, price_inr: 0 });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/api/v1/paths")
      .then(({ data }) => setPaths(data))
      .finally(() => setLoading(false));
  }, []);

  async function createPath(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const { data } = await api.post("/api/v1/paths", {
        title: form.title,
        description: form.description || null,
        price_usd: Number(form.price_usd),
        price_inr: Number(form.price_inr),
      });
      setPaths((prev) => [...prev, { ...data, course_count: 0 }]);
      setShowCreate(false);
      setForm({ title: "", description: "", price_usd: 0, price_inr: 0 });
    } catch {
      setError("Failed to create path.");
    } finally {
      setCreating(false);
    }
  }

  async function deletePath(id: number) {
    if (!confirm("Delete this learning path?")) return;
    await api.delete(`/api/v1/paths/${id}`);
    setPaths((prev) => prev.filter((p) => p.id !== id));
  }

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Learning Paths</h1>
          <p className="text-sm text-slate-500 mt-1">Bundle courses into guided sequences</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
        >
          <Plus className="w-4 h-4" aria-hidden="true" /> New Path
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form
          onSubmit={createPath}
          className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 space-y-4"
        >
          <h2 className="font-semibold text-slate-800">New Learning Path</h2>
          <div>
            <label htmlFor="path-title" className="block text-sm font-medium text-slate-700 mb-1">
              Title
            </label>
            <input
              id="path-title"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="path-desc" className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              id="path-desc"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="path-usd" className="block text-sm font-medium text-slate-700 mb-1">
                Bundle price (USD)
              </label>
              <input
                id="path-usd"
                type="number"
                min="0"
                step="0.01"
                value={form.price_usd}
                onChange={(e) => setForm({ ...form, price_usd: Number(e.target.value) })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="path-inr" className="block text-sm font-medium text-slate-700 mb-1">
                Bundle price (INR ₹)
              </label>
              <input
                id="path-inr"
                type="number"
                min="0"
                value={form.price_inr}
                onChange={(e) => setForm({ ...form, price_inr: Number(e.target.value) })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={creating}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {creating ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Path list */}
      {paths.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" aria-hidden="true" />
          <p>No learning paths yet. Create your first one above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paths.map((path) => (
            <div
              key={path.id}
              className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-4"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 truncate">{path.title}</h3>
                {path.description && (
                  <p className="text-sm text-slate-500 truncate">{path.description}</p>
                )}
                <p className="text-xs text-slate-400 mt-1">
                  {path.course_count} course{path.course_count !== 1 ? "s" : ""} ·{" "}
                  {path.price_usd > 0 ? `$${path.price_usd}` : "Free"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/paths/${path.slug}`}
                  className="text-xs text-indigo-600 hover:underline"
                  target="_blank"
                >
                  View
                </Link>
                <button
                  onClick={() => deletePath(path.id)}
                  aria-label={`Delete ${path.title}`}
                  className="text-slate-300 hover:text-red-500 transition"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
