"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Award, XCircle } from "lucide-react";
import api from "@/lib/api";

interface CertData {
  valid: boolean;
  student_name: string;
  course_title: string;
  issued_at: string;
  certificate_uuid: string;
}

export default function CertificatePage() {
  const { uuid } = useParams<{ uuid: string }>();
  const [cert, setCert] = useState<CertData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api
      .get(`/api/v1/certificates/${uuid}/verify`)
      .then(({ data }) => setCert(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [uuid]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !cert) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <XCircle className="w-16 h-16 text-red-300 mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Certificate Not Found</h1>
        <p className="text-slate-500 mb-6">This certificate link is invalid or has been removed.</p>
        <Link href="/" className="text-indigo-600 font-medium hover:underline">
          Go to homepage
        </Link>
      </div>
    );
  }

  const issued = new Date(cert.issued_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col items-center justify-center px-4 py-16">
      {/* Verified badge */}
      <div className="flex items-center gap-2 bg-green-100 text-green-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-8">
        <CheckCircle className="w-4 h-4" />
        Verified Certificate
      </div>

      {/* Certificate card */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-lg w-full p-10 text-center">
        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Award className="w-8 h-8 text-indigo-600" />
        </div>
        <p className="text-xs font-bold tracking-widest text-purple-600 uppercase mb-3">
          Forgiven Generation Church
        </p>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Certificate of Completion</h1>
        <p className="text-slate-500 text-sm mb-6">This certifies that</p>

        <p className="text-3xl font-bold text-indigo-700 mb-2">{cert.student_name}</p>
        <p className="text-slate-500 text-sm mb-4">has successfully completed</p>
        <p className="text-xl font-bold text-slate-900 mb-6">"{cert.course_title}"</p>

        <div className="border-t border-slate-100 pt-6 text-sm text-slate-500">
          <p>Issued on <span className="font-semibold text-slate-700">{issued}</span></p>
          <p className="mt-1 text-xs font-mono text-slate-400 break-all">ID: {cert.certificate_uuid}</p>
        </div>
      </div>

      <div className="mt-8 flex gap-4">
        <a
          href={`${apiBase}/api/v1/certificates/${uuid}/download`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
        >
          Download PDF
        </a>
        <Link
          href="/courses"
          className="border border-slate-300 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition"
        >
          Browse Courses
        </Link>
      </div>
    </div>
  );
}
