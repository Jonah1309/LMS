"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-slate-50">
          <p className="text-6xl font-bold text-red-200 mb-4">500</p>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h1>
          <p className="text-slate-500 mb-6">An unexpected error occurred. Please try again.</p>
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
            >
              Try again
            </button>
            <Link
              href="/"
              className="border border-slate-300 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition"
            >
              Go home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
