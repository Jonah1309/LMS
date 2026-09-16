import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-slate-50">
      <p className="text-6xl font-bold text-indigo-200 mb-4">404</p>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Page not found</h1>
      <p className="text-slate-500 mb-6">The page you're looking for doesn't exist or has been moved.</p>
      <Link
        href="/"
        className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
      >
        Back to home
      </Link>
    </div>
  );
}
