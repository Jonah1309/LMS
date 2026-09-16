"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, BookOpen, Eye, EyeOff } from "lucide-react";
import api from "@/lib/api";

interface Course {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  price_usd: number;
  price_inr: number;
  avg_rating: number;
  review_count: number;
}

export default function InstructorCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    api.get("/api/v1/courses/mine").then(({ data }) => setCourses(data)).finally(() => setLoading(false));
  }, []);

  async function createCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post("/api/v1/courses", { title: newTitle });
      setCourses((prev) => [data, ...prev]);
      setNewTitle("");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Courses</h1>
      </div>

      {/* Quick create */}
      <form onSubmit={createCourse} className="flex gap-3 mb-8">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New course title…"
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={creating || !newTitle.trim()}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          <Plus className="w-4 h-4" />
          Create
        </button>
      </form>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-200 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No courses yet. Create your first one above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <div key={course.id} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {course.status === "published" ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      <Eye className="w-3 h-3" /> Published
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      <EyeOff className="w-3 h-3" /> Draft
                    </span>
                  )}
                </div>
                <h2 className="font-semibold text-slate-900 truncate">{course.title}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  ${course.price_usd} USD · ₹{course.price_inr} INR
                </p>
              </div>
              <Link
                href={`/instructor/courses/${course.id}/edit`}
                className="text-sm text-indigo-600 font-medium hover:underline whitespace-nowrap"
              >
                Edit →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
