"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided.");
      return;
    }
    api.get(`/api/v1/auth/verify-email?token=${token}`)
      .then(() => { setStatus("success"); })
      .catch((err) => {
        setStatus("error");
        setMessage(err?.response?.data?.detail ?? "Verification failed.");
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
        {status === "loading" && <p className="text-slate-500">Verifying your email…</p>}
        {status === "success" && (
          <>
            <div className="text-4xl mb-4">✓</div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Email verified!</h1>
            <p className="text-slate-500 mb-6">You can now sign in to Forgiven Generation Church.</p>
            <Link href="/login" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition">
              Sign in
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <div className="text-4xl mb-4">✗</div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Verification failed</h1>
            <p className="text-slate-500 mb-6">{message}</p>
            <Link href="/register" className="text-indigo-600 font-medium hover:underline">
              Back to register
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
