"use client";

/**
 * Face Enrollment Page (US-004)
 *
 * Guides an Admin through capturing 5 facial images of a student at varied
 * angles and submitting them to the backend for ArcFace embedding generation.
 *
 * Route: /dashboard/users/[id]/enroll
 * Access: Admin only (enforced by backend; frontend guard via useAuthStore)
 */
import { useCallback, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Webcam from "react-webcam";
import {
  Camera,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  ShieldAlert,
  Trash2,
  XCircle,
} from "lucide-react";

import { attendanceApi, usersApi } from "@/lib/api";
import type { EnrollmentResponse, User } from "@/types";

// ── Angle guidance steps ───────────────────────────────────────────────────────

const ANGLE_STEPS = [
  { label: "Look straight at the camera", hint: "Center your face in the frame" },
  { label: "Turn slightly to the left",   hint: "About 15–20 degrees" },
  { label: "Turn slightly to the right",  hint: "About 15–20 degrees" },
  { label: "Tilt your head slightly up",  hint: "Chin up a little" },
  { label: "Look straight again",         hint: "Final confirmation image" },
];

const MIN_IMAGES = 5;

// ── Component ─────────────────────────────────────────────────────────────────

export default function EnrollFacePage() {
  const { id: userId } = useParams<{ id: string }>();
  const router = useRouter();

  const webcamRef = useRef<{ getScreenshot: () => string | null } | null>(null);

  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<EnrollmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch user to check consent status ──────────────────────────────────────

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["user", userId],
    queryFn: async () => {
      const res = await usersApi.get(userId);
      return res.data;
    },
  });

  // ── Capture one image ────────────────────────────────────────────────────────

  const captureImage = useCallback(() => {
    if (!webcamRef.current || isCapturing) return;
    setIsCapturing(true);

    const screenshot = webcamRef.current.getScreenshot();
    if (!screenshot) {
      setError("Could not capture image. Ensure the camera is connected.");
      setIsCapturing(false);
      return;
    }

    // Brief visual flash then add to list
    setTimeout(() => {
      setCapturedImages((prev) => [...prev, screenshot]);
      setIsCapturing(false);
    }, 200);
  }, [isCapturing]);

  // ── Remove a captured image ──────────────────────────────────────────────────

  const removeImage = (index: number) => {
    setCapturedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Submit enrollment ────────────────────────────────────────────────────────

  const submitEnrollment = async () => {
    if (capturedImages.length < MIN_IMAGES) {
      setError(`Please capture at least ${MIN_IMAGES} images before enrolling.`);
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      // Strip data:image/jpeg;base64, prefix to get raw base64
      const base64Images = capturedImages.map((img) => img.split(",")[1]);
      const res = await attendanceApi.enroll({
        user_id: userId,
        images_base64: base64Images,
      });
      setResult(res.data as EnrollmentResponse);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Enrollment failed. Please retake images and try again.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Derived state ────────────────────────────────────────────────────────────

  const currentStep = Math.min(capturedImages.length, ANGLE_STEPS.length - 1);
  const isComplete = capturedImages.length >= MIN_IMAGES;

  // ── Render: loading ──────────────────────────────────────────────────────────

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  // ── Render: consent gate ─────────────────────────────────────────────────────

  if (user && !user.biometric_consent) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-8 bg-yellow-50 border border-yellow-200 rounded-2xl text-center space-y-4">
        <ShieldAlert size={40} className="mx-auto text-yellow-500" />
        <h2 className="text-xl font-bold text-yellow-800">Biometric Consent Required</h2>
        <p className="text-yellow-700 text-sm">
          <strong>{user.full_name}</strong> has not yet provided digital consent for biometric data
          collection as required by R.A. 10173. The student must accept the consent form before
          facial enrollment can proceed.
        </p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm font-medium"
        >
          Go Back
        </button>
      </div>
    );
  }

  // ── Render: enrollment success ───────────────────────────────────────────────

  if (result?.success) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-8 bg-green-50 border border-green-200 rounded-2xl text-center space-y-4">
        <CheckCircle2 size={48} className="mx-auto text-green-500" />
        <h2 className="text-2xl font-bold text-green-800">Enrollment Successful</h2>
        <p className="text-green-700 text-sm">
          {result.images_processed} images processed. Face embedding stored for{" "}
          <strong>{user?.full_name}</strong>.
        </p>
        <button
          onClick={() => router.push(`/dashboard/users/${userId}`)}
          className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
        >
          View Profile
        </button>
      </div>
    );
  }

  // ── Render: enrollment form ──────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-gray-100 transition"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Face Enrollment</h1>
          <p className="text-sm text-gray-500">
            Student: <strong>{user?.full_name}</strong> — capture {MIN_IMAGES} images at
            varied angles
          </p>
        </div>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2">
        {ANGLE_STEPS.map((step, idx) => (
          <div key={idx} className="flex items-center gap-2 flex-1">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition ${
                idx < capturedImages.length
                  ? "bg-green-500 text-white"
                  : idx === currentStep
                  ? "bg-[#1E3A5F] text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {idx < capturedImages.length ? <CheckCircle2 size={14} /> : idx + 1}
            </div>
            {idx < ANGLE_STEPS.length - 1 && (
              <div
                className={`flex-1 h-1 rounded ${
                  idx < capturedImages.length ? "bg-green-400" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Webcam panel */}
        <div className="space-y-4">
          {/* Angle instruction */}
          {!isComplete && (
            <div className="p-4 bg-[#1E3A5F]/5 border border-[#1E3A5F]/20 rounded-xl">
              <p className="font-semibold text-[#1E3A5F]">
                Step {currentStep + 1}: {ANGLE_STEPS[currentStep].label}
              </p>
              <p className="text-sm text-gray-500 mt-1">{ANGLE_STEPS[currentStep].hint}</p>
            </div>
          )}

          {isComplete && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="font-semibold text-green-700">All {MIN_IMAGES} images captured!</p>
              <p className="text-sm text-gray-500 mt-1">
                You can capture more images for better accuracy, or proceed to enroll.
              </p>
            </div>
          )}

          {/* Camera feed */}
          <div className="relative rounded-xl overflow-hidden border-2 border-gray-200 shadow-sm bg-black">
            <Webcam
              ref={webcamRef as React.RefObject<Webcam>}
              audio={false}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.92}
              width={640}
              height={480}
              videoConstraints={{ width: 1280, height: 720, facingMode: "user" }}
              className="w-full block"
            />

            {/* Flash overlay */}
            {isCapturing && (
              <div className="absolute inset-0 bg-white/60 animate-ping-once" />
            )}

            {/* Face guide oval */}
            {!isCapturing && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-40 h-52 border-4 border-white/70 rounded-full" />
              </div>
            )}
          </div>

          {/* Capture button */}
          <button
            onClick={captureImage}
            disabled={isCapturing || isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#1E3A5F] text-white rounded-xl font-semibold hover:bg-[#16304f] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Camera size={18} />
            {isCapturing ? "Capturing…" : `Capture Image (${capturedImages.length}/${MIN_IMAGES})`}
          </button>
        </div>

        {/* Captured images panel */}
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-700">
            Captured Images ({capturedImages.length})
          </h2>

          {capturedImages.length === 0 && (
            <div className="flex items-center justify-center h-48 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
              Captured images will appear here
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {capturedImages.map((img, idx) => (
              <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt={`Capture ${idx + 1}`} className="w-full aspect-square object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                  title="Remove image"
                >
                  <Trash2 size={12} />
                </button>
                <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                  {idx + 1}
                </div>
              </div>
            ))}
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <XCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={submitEnrollment}
            disabled={!isComplete || isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Processing enrollment…
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                Enroll Face ({capturedImages.length} images)
              </>
            )}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Raw images are stored in a private MinIO bucket and deleted after 30 days (R.A. 10173).
          </p>
        </div>
      </div>
    </div>
  );
}
