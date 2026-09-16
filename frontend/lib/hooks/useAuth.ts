"use client";

import { useAuthStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useEffect } from "react";

export function useAuth() {
  const { user, token, setAuth, clearAuth } = useAuthStore();
  const router = useRouter();

  // Rehydrate user from token on mount
  useEffect(() => {
    if (token && !user) {
      api.get("/api/v1/auth/me").then(({ data }) => {
        setAuth(data, token);
      }).catch(() => {
        clearAuth();
      });
    }
  }, [token, user, setAuth, clearAuth]);

  function logout() {
    clearAuth();
    document.cookie = "token=; path=/; max-age=0";
    router.push("/login");
  }

  return { user, token, logout, isAuthenticated: !!token };
}
