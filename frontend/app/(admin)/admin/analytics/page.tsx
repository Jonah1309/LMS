"use client";

import { useEffect, useState } from "react";
import { Users, BookOpen, TrendingUp, DollarSign } from "lucide-react";
import api from "@/lib/api";

interface Overview {
  total_users: number;
  total_enrollments: number;
  total_revenue_usd: number;
  active_courses: number;
}

interface TrendPoint {
  month: string;
  count: number;
}

interface TopCourse {
  id: number;
  title: string;
  enrollment_count: number;
  revenue_usd: number;
}

export default function AdminAnalyticsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [topCourses, setTopCourses] = useState<TopCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/api/v1/analytics/admin/overview"),
      api.get("/api/v1/analytics/admin/enrollments-over-time"),
      api.get("/api/v1/analytics/admin/top-courses"),
    ])
      .then(([ov, tr, tc]) => {
        setOverview(ov.data);
        setTrend(tr.data);
        setTopCourses(tc.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!overview) return null;

  const maxCount = Math.max(...trend.map((t) => t.count), 1);

  const tiles = [
    { label: "Total Users", value: overview.total_users.toLocaleString(), icon: Users, color: "text-indigo-600 bg-indigo-50" },
    { label: "Total Enrollments", value: overview.total_enrollments.toLocaleString(), icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
    { label: "Active Courses", value: overview.active_courses.toLocaleString(), icon: BookOpen, color: "text-amber-600 bg-amber-50" },
    { label: "Revenue (USD)", value: `$${overview.total_revenue_usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: DollarSign, color: "text-violet-600 bg-violet-50" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Platform Analytics</h1>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
        {tiles.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg mb-3 ${color}`}>
              <Icon className="w-4 h-4" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Enrollment trend */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
          Enrollments — Last 6 Months
        </h2>
        {trend.length === 0 ? (
          <p className="text-sm text-slate-400">No enrollment data yet.</p>
        ) : (
          <div className="flex items-end gap-3 h-32">
            {trend.map(({ month, count }) => (
              <div key={month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-slate-500">{count}</span>
                <div
                  className="w-full bg-indigo-500 rounded-t-md transition-all"
                  style={{ height: `${Math.round((count / maxCount) * 96)}px` }}
                  title={`${month}: ${count}`}
                />
                <span className="text-xs text-slate-400">{month.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top courses */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
          Top Courses by Enrollment
        </h2>
        {topCourses.length === 0 ? (
          <p className="text-sm text-slate-400">No published courses yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                <th className="pb-2 font-medium">Course</th>
                <th className="pb-2 font-medium text-right">Enrollments</th>
                <th className="pb-2 font-medium text-right">Revenue (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {topCourses.map((c) => (
                <tr key={c.id}>
                  <td className="py-2.5 font-medium text-slate-800 truncate max-w-xs">{c.title}</td>
                  <td className="py-2.5 text-right text-slate-600">{c.enrollment_count.toLocaleString()}</td>
                  <td className="py-2.5 text-right text-slate-600">
                    ${c.revenue_usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
