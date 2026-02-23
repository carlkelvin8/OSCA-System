"use client";

/**
 * US-002: Student Self-Registration
 * Students fill out their profile, provide biometric consent (R.A. 10173),
 * and submit for Admin approval before the account is activated.
 *
 * Design: Direction 1 – Clean Professional (dark navy #0f172a auth shell,
 * white card, blue #2563eb primary, aligned to OSCA PRD v2 frontend spec).
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { usersApi } from "@/lib/api";
import { ShieldCheck, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";

// ── Zod schema ─────────────────────────────────────────────────────────────────

const registerSchema = z
  .object({
    first_name: z.string().min(2, "First name is required"),
    last_name: z.string().min(2, "Last name is required"),
    middle_name: z.string().optional(),
    email: z.string().email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string(),
    student_id: z
      .string()
      .min(4, "Student ID is required")
      .regex(/^[A-Z0-9\-]+$/i, "Student ID may only contain letters, numbers, and dashes"),
    course: z.string().min(2, "Course is required"),
    year_level: z.string().min(1, "Year level is required"),
    sport_or_art: z.string().min(2, "Sport or art is required"),
    medical_info: z.string().optional(),
    emergency_contact_name: z.string().min(2, "Emergency contact name is required"),
    emergency_contact_number: z
      .string()
      .min(7, "Emergency contact number is required")
      .regex(/^\+?[0-9\s\-()]+$/, "Enter a valid phone number"),
    biometric_consent: z.literal(true, {
      errorMap: () => ({
        message: "You must provide consent to proceed with enrollment",
      }),
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

// ── Step labels ────────────────────────────────────────────────────────────────

const STEPS = ["Account", "Profile", "Emergency & Consent"];

// ── Field helpers ──────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#374151] mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

const inputCls =
  "w-full border border-[#d1d5db] rounded-lg px-3 py-2.5 text-sm text-[#111827] " +
  "focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent " +
  "placeholder:text-[#9ca3af]";

// ── Component ──────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
  });

  // Fields per step — used for per-step validation before advancing
  const stepFields: (keyof RegisterForm)[][] = [
    ["email", "password", "confirmPassword"],
    ["first_name", "last_name", "student_id", "course", "year_level", "sport_or_art"],
    ["emergency_contact_name", "emergency_contact_number", "biometric_consent"],
  ];

  const advance = async () => {
    const valid = await trigger(stepFields[step] as (keyof RegisterForm)[]);
    if (valid) setStep((s) => s + 1);
  };

  const onSubmit = async (data: RegisterForm) => {
    setApiError(null);
    try {
      await usersApi.create({
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
        middle_name: data.middle_name || undefined,
        role: "student",
        student_id: data.student_id,
        course: data.course,
        year_level: data.year_level,
        sport_or_art: data.sport_or_art,
        medical_info: data.medical_info || undefined,
        emergency_contact_name: data.emergency_contact_name,
        emergency_contact_number: data.emergency_contact_number,
        biometric_consent: true,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Registration failed. Please try again.";
      setApiError(msg);
    }
  };

  // ── Success screen ───────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md text-center">
          <CheckCircle2 size={52} className="text-[#2563eb] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#111827] mb-2">Registration Submitted</h2>
          <p className="text-sm text-[#6b7280] mb-6">
            Your account is pending Admin approval. You will be notified once it is activated.
          </p>
          <Link
            href="/login"
            className="inline-block bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold py-2.5 px-6 rounded-lg transition"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] py-10">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-[#f3f4f6]">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-lg bg-[#2563eb] flex items-center justify-center text-white font-bold text-lg">
              O
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#111827] leading-tight">OSCA System</h1>
              <p className="text-xs text-[#6b7280]">NAAP-Villamor · Student Registration</p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-5">
            {STEPS.map((label, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition ${
                    i < step
                      ? "bg-[#2563eb] text-white"
                      : i === step
                      ? "border-2 border-[#2563eb] text-[#2563eb]"
                      : "border-2 border-[#d1d5db] text-[#9ca3af]"
                  }`}
                >
                  {i < step ? "✓" : i + 1}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:block ${
                    i === step ? "text-[#2563eb]" : "text-[#9ca3af]"
                  }`}
                >
                  {label}
                </span>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-px flex-1 ${i < step ? "bg-[#2563eb]" : "bg-[#e5e7eb]"}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-6 space-y-4">
          {/* ── STEP 0: Account ────────────────────────────────────────────── */}
          {step === 0 && (
            <>
              <p className="text-sm font-semibold text-[#111827]">Account Credentials</p>
              <Field label="Email Address" error={errors.email?.message} required>
                <input
                  {...register("email")}
                  type="email"
                  autoComplete="email"
                  placeholder="student@naap.edu.ph"
                  className={inputCls}
                />
              </Field>
              <Field label="Password" error={errors.password?.message} required>
                <input
                  {...register("password")}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  className={inputCls}
                />
              </Field>
              <Field label="Confirm Password" error={errors.confirmPassword?.message} required>
                <input
                  {...register("confirmPassword")}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  className={inputCls}
                />
              </Field>
            </>
          )}

          {/* ── STEP 1: Profile ────────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <p className="text-sm font-semibold text-[#111827]">Student Profile</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="First Name" error={errors.first_name?.message} required>
                  <input {...register("first_name")} className={inputCls} placeholder="Juan" />
                </Field>
                <Field label="Last Name" error={errors.last_name?.message} required>
                  <input {...register("last_name")} className={inputCls} placeholder="Dela Cruz" />
                </Field>
              </div>
              <Field label="Middle Name" error={errors.middle_name?.message}>
                <input {...register("middle_name")} className={inputCls} placeholder="Optional" />
              </Field>
              <Field label="Student ID" error={errors.student_id?.message} required>
                <input
                  {...register("student_id")}
                  className={inputCls}
                  placeholder="e.g. 2024-0001"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Course" error={errors.course?.message} required>
                  <input
                    {...register("course")}
                    className={inputCls}
                    placeholder="e.g. BSIT"
                  />
                </Field>
                <Field label="Year Level" error={errors.year_level?.message} required>
                  <select {...register("year_level")} className={inputCls}>
                    <option value="">Select…</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </Field>
              </div>
              <Field label="Sport / Art" error={errors.sport_or_art?.message} required>
                <input
                  {...register("sport_or_art")}
                  className={inputCls}
                  placeholder="e.g. Basketball, Dance, Chess"
                />
              </Field>
              <Field label="Medical Information" error={errors.medical_info?.message}>
                <textarea
                  {...register("medical_info")}
                  rows={2}
                  className={inputCls + " resize-none"}
                  placeholder="Allergies, conditions, or none"
                />
              </Field>
            </>
          )}

          {/* ── STEP 2: Emergency & Consent ────────────────────────────────── */}
          {step === 2 && (
            <>
              <p className="text-sm font-semibold text-[#111827]">Emergency Contact</p>
              <Field
                label="Contact Name"
                error={errors.emergency_contact_name?.message}
                required
              >
                <input
                  {...register("emergency_contact_name")}
                  className={inputCls}
                  placeholder="Full name"
                />
              </Field>
              <Field
                label="Contact Number"
                error={errors.emergency_contact_number?.message}
                required
              >
                <input
                  {...register("emergency_contact_number")}
                  type="tel"
                  className={inputCls}
                  placeholder="+63 9XX XXX XXXX"
                />
              </Field>

              {/* Biometric Consent — R.A. 10173 */}
              <div className="mt-2 p-4 bg-[#f0f4ff] border border-[#bfdbfe] rounded-xl">
                <div className="flex items-start gap-2 mb-2">
                  <ShieldCheck size={18} className="text-[#2563eb] mt-0.5 shrink-0" />
                  <p className="text-xs font-semibold text-[#1e40af]">
                    Biometric Data Consent — R.A. 10173 (Data Privacy Act of 2012)
                  </p>
                </div>
                <p className="text-xs text-[#374151] leading-relaxed mb-3">
                  I hereby give my explicit consent to the National Aviation Academy of the
                  Philippines (NAAP–Villamor) and the Office of Sports and Cultural Affairs (OSCA)
                  to collect, store, and process my facial biometric data solely for attendance
                  tracking purposes. I understand that my raw facial images will be deleted after
                  embedding generation, that face embeddings are encrypted at rest (AES-256-GCM),
                  and that I may request deletion of my biometric data at any time by contacting
                  the OSCA Data Privacy Officer.
                </p>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    {...register("biometric_consent")}
                    type="checkbox"
                    className="mt-0.5 w-4 h-4 accent-[#2563eb]"
                  />
                  <span className="text-xs text-[#111827] font-medium">
                    I have read and I agree to the biometric data consent above.
                    <span className="text-red-500 ml-0.5">*</span>
                  </span>
                </label>
                {errors.biometric_consent && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.biometric_consent.message}
                  </p>
                )}
              </div>

              {apiError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {apiError}
                </div>
              )}
            </>
          )}

          {/* ── Navigation buttons ──────────────────────────────────────────── */}
          <div className="flex gap-3 pt-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1 border border-[#d1d5db] text-[#374151] text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-[#f9fafb] transition"
              >
                <ChevronLeft size={16} /> Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={advance}
                className="flex-1 flex items-center justify-center gap-1 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold py-2.5 rounded-lg transition"
              >
                Continue <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
              >
                {isSubmitting ? "Submitting…" : "Submit Registration"}
              </button>
            )}
          </div>

          {/* Footer link */}
          <p className="text-center text-xs text-[#6b7280] pt-1">
            Already have an account?{" "}
            <Link href="/login" className="text-[#2563eb] font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
