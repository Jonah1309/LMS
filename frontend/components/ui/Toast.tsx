"use client";

import { create } from "zustand";
import { useEffect } from "react";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  add: (type: ToastType, message: string) => void;
  remove: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (type, message) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (msg: string) => useToastStore.getState().add("success", msg),
  error: (msg: string) => useToastStore.getState().add("error", msg),
  info: (msg: string) => useToastStore.getState().add("info", msg),
};

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  info: AlertCircle,
};

const STYLES = {
  success: "bg-green-600",
  error: "bg-red-600",
  info: "bg-indigo-600",
};

export function ToastContainer() {
  const { toasts, remove } = useToastStore();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => {
        const Icon = ICONS[t.type];
        return (
          <div
            key={t.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl text-white text-sm shadow-lg ${STYLES[t.type]}`}
          >
            <Icon className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} className="opacity-70 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
