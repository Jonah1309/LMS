"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
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

export default function LearningPathsPage() {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/v1/paths")
      .then(({ data }) => setPaths(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-indigo-900 to-indigo-700 text-white py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl font-bold mb-3">Learning Paths</h1>
          <p className="text-indigo-200 text-lg">
            Structured course bundles designed to take you from beginner to expert.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
                <div className="h-5 bg-slate-200 rounded w-3/4 mb-3" />
                <div className="h-4 bg-slate-100 rounded w-full mb-2" />
                <div className="h-4 bg-slate-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : paths.length === 0 ? (
          <div className="text-center py-24">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-slate-700 mb-2">No learning paths yet</h2>
            <p className="text-slate-400">Check back soon — new paths are on the way.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paths.map((path) => (
              <Link
                key={path.id}
                href={`/paths/${path.slug}`}
                className="group bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md p-6 transition flex flex-col"
              >
                <h2 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-indigo-700 transition">
                  {path.title}
                </h2>
                {path.description && (
                  <p className="text-sm text-slate-500 line-clamp-3 mb-4 flex-1">
                    {path.description}
                  </p>
                )}
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                  <div>
                    {path.price_usd > 0 ? (
                      <span className="text-sm font-semibold text-slate-800">
                        ${path.price_usd.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-green-600">Free</span>
                    )}
                    {path.course_count != null && (
                      <span className="text-xs text-slate-400 ml-2">
                        · {path.course_count} course{path.course_count !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition" aria-hidden="true" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
