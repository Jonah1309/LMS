"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, DollarSign, TrendingUp, BookOpen } from "lucide-react";
import api from "@/lib/api";

interface Overview {
  total_students: number;
  total_revenue_usd: number;
  completion_rate: number;
  active_courses: number;
}

interface CourseStats {
  id: number;
  title: string;
  status: string;
  total_students: number;
  completion_pct: number;
  revenue: number;
}

interface MonthData {
  month: string;
  count: number;
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
      <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
        <Icon className="w-5 h-5 text-indigo-600" />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function EnrollmentChart({ data }: { data: MonthData[] }) {
  if (data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-slate-400">
        No enrollment data yet.
      </div>
    );
  }
  const max = Math.max(...data.map((d) => d.count), 1);
  const chartH = 120;
  const barW = 32;
  const gap = 12;
  const totalW = data.length * (barW + gap) - gap;

  return (
    <div className="overflow-x-auto">
      <svg width={totalW + 40} height={chartH + 36} className="block mx-auto">
        {data.map((d, i) => {
          const barH = Math.max(4, Math.round((d.count / max) * chartH));
          const x = i * (barW + gap);
          const y = chartH - barH;
          const label = d.month.slice(5); // "MM"
          return (
            <g key={d.month}>
              <rect x={x} y={y} width={barW} height={barH} rx={6} className="fill-indigo-400" />
              {/* count label */}
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={10} className="fill-slate-500">
                {d.count}
              </text>
              {/* month label */}
              <text x={x + barW / 2} y={chartH + 16} textAnchor="middle" fontSize={10} className="fill-slate-400">
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function InstructorDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [courses, setCourses] = useState<CourseStats[]>([]);
  const [trend, setTrend] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/api/v1/analytics/overview"),
      api.get("/api/v1/analytics/courses"),
      api.get("/api/v1/analytics/enrollments-over-time"),
    ]).then(([ov, cs, tr]) => {
      setOverview(ov.data);
      setCourses(cs.data);
      setTrend(tr.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-200 animate-pulse rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <Link href="/instructor/courses" className="text-sm text-indigo-600 font-medium hover:underline">
          Manage courses →
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Total students" value={overview?.total_students ?? 0} />
        <StatCard icon={DollarSign} label="Revenue (USD)" value={`$${(overview?.total_revenue_usd ?? 0).toFixed(0)}`} />
        <StatCard icon={TrendingUp} label="Completion rate" value={`${overview?.completion_rate ?? 0}%`} />
        <StatCard icon={BookOpen} label="Active courses" value={overview?.active_courses ?? 0} />
      </div>

      {/* Enrollment chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
        <h2 className="font-semibold text-slate-900 mb-4">Enrollments — last 6 months</h2>
        <EnrollmentChart data={trend} />
      </div>

      {/* Course table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Course Performance</h2>
        </div>
        {courses.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">
            No courses yet.{" "}
            <Link href="/instructor/courses" className="text-indigo-600 hover:underline">Create one</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-3 text-left">Course</th>
                <th className="px-6 py-3 text-right">Students</th>
                <th className="px-6 py-3 text-right">Completion</th>
                <th className="px-6 py-3 text-right">Revenue</th>
                <th className="px-6 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courses.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    <Link href={`/instructor/courses/${c.id}/edit`} className="hover:text-indigo-600">{c.title}</Link>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600">{c.total_students}</td>
                  <td className="px-6 py-4 text-right text-slate-600">{c.completion_pct}%</td>
                  <td className="px-6 py-4 text-right text-slate-600">${c.revenue.toFixed(0)}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      c.status === "published" ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-500"
                    }`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
