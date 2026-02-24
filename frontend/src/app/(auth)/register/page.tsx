"use client";

/**
 * US-002: User Self-Registration (Updated)
 * 4-step wizard: Account → Profile → Emergency & Consent → Face Enrollment.
 * Supports all roles except admin. Student-specific fields are conditionally shown.
 *
 * Flow: register account → auto-login → enroll face → success.
 *
 * Design: Direction 1 – Clean Professional (dark navy #0f172a auth shell,
 * white card, blue #2563eb primary, aligned to OSCA PRD v2 frontend spec).
 */

import { useState, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import Webcam from "react-webcam";
import { usersApi, attendanceApi, authApi } from "@/lib/api";
import Cookies from "js-cookie";
import {
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Camera,
  RotateCcw,
} from "lucide-react";
import type { UserRole } from "@/types";

// ── Role options (no admin) ────────────────────────────────────────────────────

const REGISTRATION_ROLES: { value: UserRole; label: string }[] = [
  { value: "student", label: "Student Athlete / Artist" },
  { value: "coach", label: "Coach" },
  { value: "pe_instructor", label: "PE Instructor" },
  { value: "director", label: "OSCA Director" },
];

// ── Zod schema ─────────────────────────────────────────────────────────────────

const registerSchema = z
  .object({
    role: z.enum(["student", "coach", "pe_instructor", "director"], {
      required_error: "Please select a role",
    }),
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
    student_id: z.string().optional(),
    course: z.string().optional(),
    year_level: z.string().optional(),
    sport_or_art: z.string().min(2, "Sport or art is required"),
    contact_number: z.string().optional(),
    medical_info: z.string().optional(),
    emergency_contact_name: z.string().min(2, "Emergency contact name is required"),
    emergency_contact_number: z
      .string()
      .min(7, "Emergency contact number is required")
      .regex(/^\+?[0-9\s\-()]+$/, "Enter a valid phone number"),
    assigned_sport: z.string().optional(),
    biometric_consent: z.literal(true, {
      errorMap: () => ({
        message: "You must provide consent to proceed with enrollment",
      }),
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .superRefine((data, ctx) => {
    if (data.role === "student") {
      if (!data.student_id || data.student_id.length < 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Student ID is required",
          path: ["student_id"],
        });
      }
      if (!data.course || data.course.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Course is required",
          path: ["course"],
        });
      }
      if (!data.year_level || data.year_level.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Year level is required",
          path: ["year_level"],
        });
      }
    }
  });

type RegisterForm = z.infer<typeof registerSchema>;

// ── Step labels ────────────────────────────────────────────────────────────────

const STEPS = ["Account", "Profile", "Emergency & Consent", "Face Enrollment"];
const CAPTURE_COUNT = 5;

// ── Field helper ───────────────────────────────────────────────────────────────

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

  // Face enrollment state
  const webcamRef = useRef<Webcam>(null);
  const [captures, setCaptures] = useState<string[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
    defaultValues: { role: "student" },
  });

  const selectedRole = watch("role");

  // Fields per step — used for per-step validation before advancing
  const stepFields: (keyof RegisterForm)[][] = [
    ["email", "password", "confirmPassword", "role"],
    selectedRole === "student"
      ? ["first_name", "last_name", "student_id", "course", "year_level", "sport_or_art"]
      : ["first_name", "last_name", "sport_or_art"],
    ["emergency_contact_name", "emergency_contact_number", "biometric_consent"],
    [], // Step 3 — face enrollment, validated separately
  ];

  const advance = async () => {
    const valid = await trigger(stepFields[step] as (keyof RegisterForm)[]);
    if (valid) setStep((s) => s + 1);
  };

  // Webcam capture
  const capture = useCallback(() => {
    const img = webcamRef.current?.getScreenshot();
    if (img && captures.length < CAPTURE_COUNT) {
      setCaptures((prev) => [...prev, img]);
    }
  }, [captures.length]);

  const resetCaptures = () => {
    setCaptures([]);
    setApiError(null);
  };

  // Submit: create account → auto-login → enroll face
  const onSubmit = async (data: RegisterForm) => {
    setApiError(null);

    try {
      // 1. Create the user account
      const createPayload: Record<string, unknown> = {
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
        middle_name: data.middle_name || undefined,
        role: data.role,
        sport_or_art: data.sport_or_art,
        medical_info: data.medical_info || undefined,
        emergency_contact_name: data.emergency_contact_name,
        emergency_contact_number: data.emergency_contact_number,
        biometric_consent: true,
        contact_number: data.contact_number || undefined,
      };

      // Student-specific fields
      if (data.role === "student") {
        createPayload.student_id = data.student_id;
        createPayload.course = data.course;
        createPayload.year_level = data.year_level;
      }

      // Coach/instructor-specific
      if (data.role === "coach" || data.role === "pe_instructor") {
        createPayload.assigned_sport = data.assigned_sport || data.sport_or_art;
      }

      const { data: newUser } = await usersApi.create(createPayload);
      setCreatedUserId(newUser.id);

      // 2. Auto-login to get JWT (needed for face enrollment endpoint)
      const { data: tokenData } = await authApi.login(data.email, data.password);
      Cookies.set("access_token", tokenData.access_token, {
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        expires: 1 / 96,
      });
      Cookies.set("refresh_token", tokenData.refresh_token, {
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        expires: 7,
      });

      // 3. Enroll face
      const images = captures.map((c) => c.split(",")[1]);
      await attendanceApi.enroll({ user_id: newUser.id, images_base64: images });

      // 4. Clean up auth tokens (user should login manually to enter dashboard)
      Cookies.remove("access_token");
      Cookies.remove("refresh_token");

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
          <h2 className="text-2xl font-bold text-[#111827] mb-2">Registration Complete</h2>
          <p className="text-sm text-[#6b7280] mb-1">
            Your account has been created and your face has been enrolled.
          </p>
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
              <p className="text-xs text-[#6b7280]">NAAP-Villamor · User Registration</p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1 mt-5">
            {STEPS.map((label, i) => (
              <div key={i} className="flex items-center gap-1 flex-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition ${i < step
                      ? "bg-[#2563eb] text-white"
                      : i === step
                        ? "border-2 border-[#2563eb] text-[#2563eb]"
                        : "border-2 border-[#d1d5db] text-[#9ca3af]"
                    }`}
                >
                  {i < step ? "✓" : i + 1}
                </div>
                <span
                  className={`text-[10px] font-medium hidden sm:block leading-tight ${i === step ? "text-[#2563eb]" : "text-[#9ca3af]"
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

              <Field label="Role" error={errors.role?.message} required>
                <select {...register("role")} className={inputCls}>
                  {REGISTRATION_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Email Address" error={errors.email?.message} required>
                <input
                  {...register("email")}
                  type="email"
                  autoComplete="email"
                  placeholder="your.email@naap.edu.ph"
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
              <p className="text-sm font-semibold text-[#111827]">
                {selectedRole === "student" ? "Student Profile" : "User Profile"}
              </p>
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

              {/* Student-specific fields */}
              {selectedRole === "student" && (
                <>
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
                </>
              )}

              {/* Coach/PE Instructor: assigned sport */}
              {(selectedRole === "coach" || selectedRole === "pe_instructor") && (
                <Field label="Assigned Sport" error={errors.assigned_sport?.message}>
                  <input
                    {...register("assigned_sport")}
                    className={inputCls}
                    placeholder="e.g. Basketball, Volleyball"
                  />
                </Field>
              )}

              <Field label="Sport / Art" error={errors.sport_or_art?.message} required>
                <input
                  {...register("sport_or_art")}
                  className={inputCls}
                  placeholder="e.g. Basketball, Dance, Chess"
                />
              </Field>

              <Field label="Contact Number" error={errors.contact_number?.message}>
                <input
                  {...register("contact_number")}
                  type="tel"
                  className={inputCls}
                  placeholder="+63 9XX XXX XXXX"
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
            </>
          )}

          {/* ── STEP 3: Face Enrollment ────────────────────────────────────── */}
          {step === 3 && (
            <>
              {/* Instructions */}
              <div className="flex items-start gap-2 bg-[#f0f4ff] border border-[#bfdbfe] rounded-xl p-3">
                <Camera size={16} className="text-[#2563eb] mt-0.5 shrink-0" />
                <p className="text-xs text-[#374151] leading-relaxed">
                  Capture <strong>{CAPTURE_COUNT} photos</strong> at different angles (front, left,
                  right, slight up, slight down). Ensure good lighting. Liveness detection will be
                  applied during recognition.
                </p>
              </div>

              {/* Webcam */}
              <div className="relative rounded-xl overflow-hidden bg-[#0f172a] aspect-video">
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: "user", width: 640, height: 360 }}
                  className="w-full h-full object-cover"
                />
                {/* Face guide overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-40 h-52 border-2 border-white/40 rounded-full" />
                </div>
                {/* Counter badge */}
                <div className="absolute top-3 right-3 bg-[#0f172a]/70 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                  {captures.length} / {CAPTURE_COUNT}
                </div>
              </div>

              {/* Thumbnails */}
              {captures.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {captures.map((src, i) => (
                    <div
                      key={i}
                      className="w-14 h-14 rounded-lg overflow-hidden border-2 border-[#2563eb] relative"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`Capture ${i + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-0 right-0 bg-[#2563eb] text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-tl">
                        {i + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Capture / Reset buttons */}
              <div className="flex gap-3">
                {captures.length < CAPTURE_COUNT && (
                  <button
                    type="button"
                    onClick={capture}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[#0f172a] hover:bg-[#1e293b] text-white text-sm font-semibold py-2.5 rounded-lg transition"
                  >
                    <Camera size={15} /> Capture ({captures.length}/{CAPTURE_COUNT})
                  </button>
                )}
                {captures.length > 0 && (
                  <button
                    type="button"
                    onClick={resetCaptures}
                    className="flex items-center gap-1.5 border border-[#d1d5db] text-[#374151] text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-[#f9fafb] transition"
                  >
                    <RotateCcw size={14} /> Retake
                  </button>
                )}
              </div>

              {apiError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {apiError}
                </div>
              )}
            </>
          )}

          {/* Show API errors for non-face steps too */}
          {step < 3 && apiError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {apiError}
            </div>
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
                disabled={isSubmitting || enrolling || captures.length < CAPTURE_COUNT}
                className="flex-1 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
              >
                {isSubmitting || enrolling ? "Submitting…" : "Submit Registration"}
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
