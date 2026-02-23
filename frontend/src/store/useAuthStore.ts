/**
 * Zustand auth store.
 * Persists user session (JWT in httpOnly-like Cookies, user data in store).
 */
"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import Cookies from "js-cookie";
import { authApi } from "@/lib/api";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await authApi.login(email, password);

          // Store tokens in secure cookies
          Cookies.set("access_token", data.access_token, {
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            expires: 1 / 96, // 15 minutes (expires_in / 86400)
          });
          Cookies.set("refresh_token", data.refresh_token, {
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            expires: 7,
          });

          // Fetch user profile
          const { data: user } = await authApi.me();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Proceed with local logout even if API call fails
        } finally {
          Cookies.remove("access_token");
          Cookies.remove("refresh_token");
          set({ user: null, isAuthenticated: false });
        }
      },

      fetchCurrentUser: async () => {
        const token = Cookies.get("access_token");
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return;
        }
        try {
          const { data: user } = await authApi.me();
          set({ user, isAuthenticated: true });
        } catch {
          Cookies.remove("access_token");
          Cookies.remove("refresh_token");
          set({ user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: "osca-auth",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
