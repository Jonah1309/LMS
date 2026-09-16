"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, ChevronRight, Clock, Star } from "lucide-react";
import api from "@/lib/api";

interface PathCourse {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  order_index: number;
  is_enrolled: boolean;
  completed_modules: number | null;
}

interface LearningPath {
  id: number;
  title: string;
  description: string | null;
  slug: string;
  price_usd: number;
  price_inr: number;
  courses: PathCourse[];
  is_fully_enrolled: boolean;
}

export default function LearningPathPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [path, setPath] = useState<LearningPath | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get(`/api/v1/paths/${slug}`)
      .then(({ data }) => setPath(data))
      .catch(() => setError("Learning path not found."));
  }, [slug]);

  async function handleEnroll() {
    if (!path) return;
    setEnrolling(true);
    try {
      await api.post(`/api/v1/paths/${path.id}/enroll`);
      setPath((p) => p ? { ...p, is_fully_enrolled: true } : p);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        router.push("/login");
      } else {
        setError("Enrollment failed. Please try again.");
      }
    } finally {
      setEnrolling(false);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">{error}</p>
      </div>
    );
  }

  if (!path) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Loading…</p>
      </div>
    );
  }

  const totalCourses = path.courses.length;
  const enrolledCount = path.courses.filter((c) => c.is_enrolled).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-900 to-indigo-700 text-white py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/paths" className="text-indigo-300 hover:text-white text-sm mb-4 inline-block">
            ← All Learning Paths
          </Link>
          <h1 className="text-4xl font-bold mb-4">{path.title}</h1>
          {path.description && (
            <p className="text-indigo-100 text-lg max-w-2xl">{path.description}</p>
          )}
          <div className="flex items-center gap-6 mt-6 text-sm text-indigo-200">
            <span className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              {totalCourses} course{totalCourses !== 1 ? "s" : ""}
            </span>
            {path.is_fully_enrolled && (
              <span className="flex items-center gap-1 text-green-300">
                <Star className="w-4 h-4" aria-hidden="true" />
                {enrolledCount}/{totalCourses} enrolled
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Course sequence */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Course Sequence</h2>
          {path.courses
            .slice()
            .sort((a, b) => a.order_index - b.order_index)
            .map((course, idx) => (
              <div
                key={course.id}
                className="flex gap-4 bg-white rounded-xl border border-slate-200 p-4 items-start"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 truncate">{course.title}</h3>
                    {course.is_enrolled && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full shrink-0">
                        Enrolled
                      </span>
                    )}
                  </div>
                  {course.description && (
                    <p className="text-sm text-slate-500 line-clamp-2">{course.description}</p>
                  )}
                  {course.is_enrolled && course.completed_modules !== null && (
                    <p className="text-xs text-slate-400 mt-1">
                      {course.completed_modules} module{course.completed_modules !== 1 ? "s" : ""} completed
                    </p>
                  )}
                </div>
                {course.is_enrolled && (
                  <Link
                    href={`/courses/${course.slug}`}
                    className="shrink-0 flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Go <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                )}
              </div>
            ))}
        </div>

        {/* Enrollment card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sticky top-6">
            <div className="mb-4">
              {path.price_usd > 0 ? (
                <>
                  <p className="text-3xl font-bold text-slate-900">${path.price_usd.toFixed(2)}</p>
                  <p className="text-sm text-slate-400">₹{path.price_inr.toFixed(0)} INR</p>
                </>
              ) : (
                <p className="text-2xl font-bold text-green-600">Free</p>
              )}
            </div>
            <ul className="text-sm text-slate-600 space-y-2 mb-6">
              <li className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" aria-hidden="true" />
                {totalCourses} courses included
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400 shrink-0" aria-hidden="true" />
                Learn at your own pace
              </li>
            </ul>
            {path.is_fully_enrolled ? (
              <div className="text-center py-3 bg-green-50 text-green-700 rounded-xl text-sm font-medium">
                Enrolled in all courses
              </div>
            ) : (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition"
              >
                {enrolling ? "Enrolling…" : "Enroll in Bundle"}
              </button>
            )}
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
