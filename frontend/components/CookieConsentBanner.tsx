"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

const STORAGE_KEY = "cookie_consent";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(STORAGE_KEY, "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed bottom-0 inset-x-0 z-50 bg-slate-900 text-white px-6 py-4 shadow-xl"
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="flex-1 text-sm text-slate-300">
          We use cookies to keep you logged in, remember preferences, and understand how the
          platform is used.{" "}
          <Link href="/privacy" className="underline hover:text-white">
            Privacy Policy
          </Link>
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={decline}
            className="text-sm text-slate-400 hover:text-white transition"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="bg-indigo-500 hover:bg-indigo-400 text-white text-sm px-4 py-2 rounded-lg font-medium transition"
          >
            Accept
          </button>
          <button
            onClick={decline}
            aria-label="Close cookie banner"
            className="text-slate-400 hover:text-white ml-1"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
