"use client";

/**
 * Login page — Direction 1: Clean Professional
 * Dark navy auth shell (#0f172a), white card, blue primary (#2563eb).
 * Aligned to OSCA PRD v2 frontend spec.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setApiError(null);
    try {
      await login(data.email, data.password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Login failed. Check your credentials.";
      setApiError(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md mx-4">
        {/* Brand header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#2563eb] flex items-center justify-center text-white font-bold text-xl shrink-0">
            O
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111827] leading-tight">OSCA System</h1>
            <p className="text-xs text-[#6b7280]">
              NAAP-Villamor · Office of Sports &amp; Cultural Affairs
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">
              Email Address
            </label>
            <input
              {...register("email")}
              type="email"
              autoComplete="email"
              placeholder="your.email@naap.edu.ph"
              className="w-full border border-[#d1d5db] rounded-lg px-4 py-2.5 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-[#374151]">Password</label>
            </div>
            <input
              {...register("password")}
              type="password"
              autoComplete="current-password"
              className="w-full border border-[#d1d5db] rounded-lg px-4 py-2.5 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          {apiError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {apiError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60 text-sm mt-2"
          >
            {isSubmitting ? "Signing in…" : "Sign In"}
          </button>
        </form>

        {/* Register link — students only */}
        <div className="mt-6 pt-5 border-t border-[#f3f4f6] text-center">
          <p className="text-xs text-[#6b7280]">
            Student Athlete or Artist?{" "}
            <Link
              href="/register"
              className="text-[#2563eb] font-medium hover:underline"
            >
              Register your account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
