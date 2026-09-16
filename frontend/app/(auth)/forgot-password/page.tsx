"use client";

import { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/api/v1/auth/forgot-password", { email });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-4xl mb-4">✉</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Check your inbox</h1>
          <p className="text-slate-500 mb-6">
            If <strong>{email}</strong> has an account, you&apos;ll receive a reset link shortly.
          </p>
          <Link href="/login" className="text-indigo-600 font-medium hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Forgot password?</h1>
        <p className="text-slate-500 text-sm mb-6">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white rounded-lg py-2 font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          <Link href="/login" className="text-indigo-600 font-medium hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
