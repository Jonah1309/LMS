"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { Receipt } from "lucide-react";
import api from "@/lib/api";

interface Payment {
  id: number;
  course_id: number;
  course_title: string;
  amount: number;
  currency: string;
  payment_provider: string;
  status: string;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-50 text-green-600",
  pending: "bg-amber-50 text-amber-600",
  failed: "bg-red-50 text-red-600",
  refunded: "bg-slate-100 text-slate-500",
};

export default function BillingPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/v1/payments/me").then(({ data }) => setPayments(data)).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Payment History</h1>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-200 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No payments yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 font-medium">
                <tr>
                  <th className="px-5 py-3 text-left">Course</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-left">Provider</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-3 font-medium text-slate-900">{p.course_title}</td>
                    <td className="px-5 py-3 text-right text-slate-700">
                      {p.currency === "INR" ? "₹" : "$"}{p.amount.toFixed(0)}
                    </td>
                    <td className="px-5 py-3 text-slate-500 capitalize">{p.payment_provider}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[p.status] ?? "bg-slate-100 text-slate-500"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
