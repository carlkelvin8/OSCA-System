"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { Eye, EyeOff, LogIn, Loader2, Fingerprint, Shield, Zap } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type LoginForm = z.infer<typeof loginSchema>;

function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-violet-400/30 rounded-full animate-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 8}s`,
            animationDuration: `${6 + Math.random() * 8}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setApiError(null);
    try {
      await login(data.email, data.password);
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Login failed. Check your credentials.";
      setApiError(msg);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-[#030014]">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.15]" style={{ background: "radial-gradient(circle, #7c3aed, transparent 70%)", filter: "blur(80px)" }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.12]" style={{ background: "radial-gradient(circle, #4f46e5, transparent 70%)", filter: "blur(80px)" }} />
        <div className="absolute top-[40%] right-[30%] w-[400px] h-[400px] rounded-full opacity-[0.08]" style={{ background: "radial-gradient(circle, #06b6d4, transparent 70%)", filter: "blur(60px)" }} />
      </div>
      <FloatingParticles />

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

      {/* Left Panel — Branding */}
      <div className="hidden lg:flex flex-col justify-center flex-1 p-12 relative z-10">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-2xl shadow-violet-600/30">
              O
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">OSCA System</h1>
              <p className="text-xs text-white/40">Attendance & Inventory Management</p>
            </div>
          </div>

          <h2 className="text-5xl font-black text-white leading-[1.1] mb-5">
            Smart Campus<br />
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Management
            </span>
          </h2>
          <p className="text-white/40 text-sm leading-relaxed mb-8">
            AI-powered facial recognition, real-time analytics, and smart inventory tracking for the Office of Sports & Cultural Affairs.
          </p>

          {/* Feature pills */}
          <div className="flex flex-col gap-3 mb-10">
            {[
              { icon: Fingerprint, text: "Biometric Attendance", color: "from-violet-500/20 to-violet-600/10" },
              { icon: Shield, text: "Enterprise Security", color: "from-indigo-500/20 to-indigo-600/10" },
              { icon: Zap, text: "Real-time Analytics", color: "from-cyan-500/20 to-cyan-600/10" },
            ].map((f, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r ${f.color} border border-white/[0.05] backdrop-blur-sm`}
                style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateX(0)" : "translateX(-20px)", transition: `all 0.6s ease ${0.3 + i * 0.15}s` }}
              >
                <f.icon size={18} className="text-white/60" />
                <span className="text-sm text-white/70 font-medium">{f.text}</span>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-white/20">
          © 2024 OSCA — National Aviation Academy of Philippines
        </p>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div
          className="w-full max-w-[400px]"
          style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)", transition: "all 0.7s ease 0.2s" }}
        >
          {/* Mobile brand (hidden on desktop) */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-violet-500/25">
              O
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">OSCA System</h1>
              <p className="text-[10px] text-white/40">NAAP-Villamor</p>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.07] rounded-3xl p-8 shadow-[0_20px_80px_rgba(0,0,0,0.4)]">
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
              <p className="text-sm text-white/35">Enter your credentials to continue</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-[11px] font-semibold text-white/50 mb-2 uppercase tracking-widest">
                  Email
                </label>
                <div className="relative group">
                  <input
                    {...register("email")}
                    type="email"
                    autoComplete="email"
                    placeholder="your.email@naap.edu.ph"
                    className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 focus:bg-white/[0.05] transition-all duration-300"
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-600/0 via-violet-600/0 to-indigo-600/0 group-focus-within:from-violet-600/5 group-focus-within:via-violet-600/5 group-focus-within:to-indigo-600/5 transition-all duration-300 pointer-events-none" />
                </div>
                {errors.email && <p className="text-red-400 text-xs mt-1.5 pl-1">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-semibold text-white/50 mb-2 uppercase tracking-widest">
                  Password
                </label>
                <div className="relative group">
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 focus:bg-white/[0.05] transition-all duration-300 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-600/0 via-violet-600/0 to-indigo-600/0 group-focus-within:from-violet-600/5 group-focus-within:via-violet-600/5 group-focus-within:to-indigo-600/5 transition-all duration-300 pointer-events-none" />
                </div>
                {errors.password && <p className="text-red-400 text-xs mt-1.5 pl-1">{errors.password.message}</p>}
              </div>

              {/* Error */}
              {apiError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-300 text-sm px-4 py-3 rounded-xl">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  {apiError}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-violet-600 via-violet-600 to-indigo-600 hover:from-violet-500 hover:via-violet-500 hover:to-indigo-500 text-white font-semibold py-3.5 rounded-xl transition-all duration-300 disabled:opacity-40 shadow-[0_8px_30px_rgba(124,58,237,0.3)] hover:shadow-[0_12px_40px_rgba(124,58,237,0.4)] active:scale-[0.98] text-sm"
              >
                {isSubmitting ? (
                  <><Loader2 size={16} className="animate-spin" /> Signing in…</>
                ) : (
                  <><LogIn size={16} /> Sign In</>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-[10px] text-white/20 uppercase tracking-widest">or</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            {/* Register link */}
            <Link
              href="/register"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/[0.07] text-white/60 text-sm font-medium hover:bg-white/[0.03] hover:border-white/[0.12] hover:text-white/80 transition-all duration-300"
            >
              Create new account
            </Link>
          </div>

          {/* Bottom text */}
          <p className="text-center text-[10px] text-white/15 mt-6 lg:hidden">
            © 2024 OSCA — NAAP Campus
          </p>
        </div>
      </div>

      {/* Custom animation styles */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          25% { transform: translateY(-20px) translateX(10px); opacity: 0.6; }
          50% { transform: translateY(-10px) translateX(-5px); opacity: 0.4; }
          75% { transform: translateY(-30px) translateX(15px); opacity: 0.5; }
        }
        .animate-float { animation: float 8s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
