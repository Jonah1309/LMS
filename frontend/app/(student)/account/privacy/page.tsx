"use client";

import { useState } from "react";
import { Shield, Download, Trash2, AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

export default function AccountPrivacyPage() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function exportData() {
    setExporting(true);
    try {
      const { data } = await api.get("/api/v1/users/me/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    if (confirm !== "DELETE") return;
    setDeleting(true);
    setError(null);
    try {
      await api.delete("/api/v1/users/me");
      localStorage.removeItem("token");
      router.push("/");
    } catch {
      setError("Deletion failed. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-6 h-6 text-indigo-600" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-slate-900">Privacy & Data</h1>
      </div>

      {/* Export */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <h2 className="font-semibold text-slate-800 mb-1">Export Your Data</h2>
        <p className="text-sm text-slate-500 mb-4">
          Download a JSON file containing your profile, enrollments, payments, progress, and notes.
        </p>
        <button
          onClick={exportData}
          disabled={exporting}
          className="flex items-center gap-2 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          {exporting ? "Exporting…" : "Download My Data"}
        </button>
      </section>

      {/* Delete account */}
      <section className="bg-white rounded-2xl border border-red-200 p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="font-semibold text-slate-800">Delete Account</h2>
            <p className="text-sm text-slate-500 mt-1">
              This will permanently anonymize your personal information. Your purchase history and
              progress records will be retained in anonymized form for accounting integrity.
            </p>
          </div>
        </div>
        <label htmlFor="confirm-delete" className="block text-sm font-medium text-slate-700 mb-1">
          Type <span className="font-mono font-bold">DELETE</span> to confirm
        </label>
        <input
          id="confirm-delete"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="DELETE"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 mb-3"
        />
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <button
          onClick={deleteAccount}
          disabled={confirm !== "DELETE" || deleting}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 transition"
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
          {deleting ? "Deleting…" : "Delete My Account"}
        </button>
      </section>
    </div>
  );
}
