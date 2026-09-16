"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { BookOpen, CheckCircle, Award, PlayCircle, Download } from "lucide-react";
import api from "@/lib/api";

interface Enrollment {
  enrollment_id: number;
  course_id: number;
  course_title: string;
  course_slug: string;
  course_thumbnail: string | null;
  enrolled_at: string;
  completion_status: string;
  total_modules: number;
  completed_modules: number;
  progress_pct: number;
}

interface Certificate {
  course_id: number;
  certificate_uuid: string;
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function StudentDashboard() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [certMap, setCertMap] = useState<Record<number, string>>({}); // course_id → uuid
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/api/v1/enrollments/me"),
      api.get("/api/v1/certificates/me"),
    ]).then(([e, c]) => {
      setEnrollments(e.data);
      const map: Record<number, string> = {};
      (c.data as Certificate[]).forEach((cert) => { map[cert.course_id] = cert.certificate_uuid; });
      setCertMap(map);
    }).finally(() => setLoading(false));
  }, []);

  const active = enrollments.filter((e) => e.completion_status !== "completed");
  const completed = enrollments.filter((e) => e.completion_status === "completed");
  const totalPct = enrollments.length
    ? Math.round(enrollments.reduce((sum, e) => sum + e.progress_pct, 0) / enrollments.length)
    : 0;

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-900">My Dashboard</h1>
          <Link href="/courses" className="text-sm text-indigo-600 font-medium hover:underline">
            Browse more courses →
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {[
            { icon: BookOpen, label: "Enrolled", value: enrollments.length },
            { icon: PlayCircle, label: "In Progress", value: active.length },
            { icon: CheckCircle, label: "Completed", value: completed.length },
            { icon: Award, label: "Avg Progress", value: `${totalPct}%` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-xl font-bold text-slate-900">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-slate-200 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : enrollments.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium mb-1">No courses yet</p>
            <p className="text-sm mb-4">Explore our catalog to get started.</p>
            <Link href="/courses" className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
              Browse courses
            </Link>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section className="mb-10">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">In Progress</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {active.map((e) => (
                    <CourseCard key={e.enrollment_id} enrollment={e} />
                  ))}
                </div>
              </section>
            )}

            {completed.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Completed</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {completed.map((e) => (
                    <CourseCard key={e.enrollment_id} enrollment={e} completed certUuid={certMap[e.course_id]} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}

function CourseCard({
  enrollment: e,
  completed,
  certUuid,
}: {
  enrollment: Enrollment;
  completed?: boolean;
  certUuid?: string;
}) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-sm transition">
      <div className="aspect-video bg-slate-100 overflow-hidden">
        {e.course_thumbnail ? (
          <img src={e.course_thumbnail} alt={e.course_title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-slate-300">📖</div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-slate-900 text-sm mb-3 line-clamp-2">{e.course_title}</h3>
        <ProgressBar pct={e.progress_pct} />
        <div className="flex items-center justify-between mt-1.5 mb-3">
          <span className="text-xs text-slate-500">{e.completed_modules}/{e.total_modules} modules</span>
          <span className="text-xs font-semibold text-indigo-600">{e.progress_pct}%</span>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/learn/${e.course_id}`}
            className="flex-1 text-center text-xs font-semibold py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
          >
            {completed ? "Review" : "Continue"}
          </Link>
          {completed && certUuid && (
            <a
              href={`${apiBase}/api/v1/certificates/${certUuid}/download`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Certificate
            </a>
          )}
          {completed && !certUuid && (
            <span className="text-xs px-3 py-2 rounded-lg border border-slate-100 text-slate-400">
              Cert pending
            </span>
          )}
        </div>
        {completed && certUuid && (
          <Link
            href={`/certificates/${certUuid}`}
            className="mt-2 block text-center text-xs text-slate-400 hover:text-indigo-500 transition"
          >
            View & share certificate →
          </Link>
        )}
      </div>
    </div>
  );
}
