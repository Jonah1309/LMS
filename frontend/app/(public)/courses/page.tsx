"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { Search, Star } from "lucide-react";
import api from "@/lib/api";

interface Course {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  price_usd: number;
  price_inr: number;
  thumbnail_url: string | null;
  avg_rating: number;
  review_count: number;
}

function CourseCard({ course }: { course: Course }) {
  return (
    <Link href={`/courses/${course.slug}`} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition">
      <div className="aspect-video bg-slate-100 overflow-hidden">
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 text-4xl">📖</div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2">{course.title}</h3>
        {course.description && (
          <p className="text-sm text-slate-500 line-clamp-2 mb-3">{course.description}</p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm text-amber-500">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span className="font-medium">{course.avg_rating > 0 ? course.avg_rating.toFixed(1) : "New"}</span>
            {course.review_count > 0 && <span className="text-slate-400">({course.review_count})</span>}
          </div>
          <span className="text-sm font-semibold text-slate-900">
            {course.price_usd === 0 ? "Free" : `$${course.price_usd}`}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/v1/courses").then(({ data }) => setCourses(data)).finally(() => setLoading(false));
  }, []);

  const filtered = courses.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    (c.description ?? "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">All Courses</h1>
          <p className="text-slate-500">Deepen your faith through structured ministry education.</p>
        </div>

        {/* Search */}
        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses…"
            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <div key={i} className="h-64 bg-slate-200 animate-pulse rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg">No courses found{query ? ` for "${query}"` : ""}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((c) => <CourseCard key={c.id} course={c} />)}
          </div>
        )}
      </main>
    </>
  );
}
