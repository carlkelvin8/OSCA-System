"use client";

/**
 * Attendance Scan — authenticated facial-recognition time-in/time-out.
 *
 * Previously a public kiosk; now requires Admin, Coach, or PE Instructor login.
 * Students and unauthenticated users are redirected away.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Webcam from "react-webcam";
import { useFacialRecognition } from "@/hooks/useFacialRecognition";
import { CheckCircle2, XCircle, AlertCircle, Loader2, ChevronDown, ArrowLeft } from "lucide-react";
import type { FaceScanResponse, PaginatedResponse, Session } from "@/types";
import { attendanceApi } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { format } from "date-fns";
import Link from "next/link";

const ALLOWED_ROLES = ["admin", "coach", "pe_instructor"] as const;

export default function KioskPage() {
  const { user, isAuthenticated, isLoading: authLoading, fetchCurrentUser } = useAuthStore();
  const router = useRouter();

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [scanType, setScanType] = useState<"time_in" | "time_out">("time_in");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "warning";
    message: string;
    name?: string;
  } | null>(null);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);

  // ── Auth check ────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      router.replace("/login");
      return;
    }
    if (!ALLOWED_ROLES.includes(user.role as typeof ALLOWED_ROLES[number])) {
      // Students go back to the dashboard
      router.replace("/dashboard");
    }
  }, [authLoading, isAuthenticated, user, router]);

  // ── Fetch active sessions ─────────────────────────────────────────────────

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery<PaginatedResponse<Session>>({
    queryKey: ["kiosk-active-sessions"],
    queryFn: async () => {
      const res = await attendanceApi.listSessions({ is_active: true, page_size: 50 });
      return res.data;
    },
    refetchInterval: 30_000,
    enabled: !!user && ALLOWED_ROLES.includes(user.role as typeof ALLOWED_ROLES[number]),
  });

  const activeSessions = sessionsData?.items ?? [];

  // ── Facial recognition hook ───────────────────────────────────────────────

  const { webcamRef, isScanning, captureAndScan } = useFacialRecognition({
    sessionId: selectedSessionId ?? "",
    scanType,
    onSuccess: (result: FaceScanResponse) => {
      setConsecutiveFailures(0);
      setFeedback({
        type: "success",
        message: scanType === "time_in" ? "Time-In Recorded!" : "Time-Out Recorded!",
        name: result.matched_user_name ?? undefined,
      });
      setTimeout(() => setFeedback(null), 4000);
    },
    onFailure: (result: FaceScanResponse) => {
      const newCount = consecutiveFailures + 1;
      setConsecutiveFailures(newCount);
      setFeedback({
        type: newCount >= 3 ? "warning" : "error",
        message:
          newCount >= 3
            ? "Multiple scan failures detected. Admin has been alerted."
            : result.message || "Recognition failed. Please try again.",
      });
      setTimeout(() => setFeedback(null), 4000);
    },
  });

  // ── Loading / auth guard ──────────────────────────────────────────────────

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#1E3A5F] flex items-center justify-center">
        <Loader2 className="text-white animate-spin" size={40} />
      </div>
    );
  }

  // ── Session selector ──────────────────────────────────────────────────────

  if (!selectedSessionId) {
    return (
      <div className="min-h-screen bg-[#1E3A5F] flex flex-col items-center justify-center p-8">
        {/* Back to dashboard */}
        <div className="absolute top-4 left-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition"
          >
            <ArrowLeft size={15} /> Dashboard
          </Link>
        </div>
        <div className="text-center text-white mb-8">
          <h1 className="text-3xl font-bold">OSCA Attendance Scan</h1>
          <p className="text-blue-200 mt-2">NAAP-Villamor Campus</p>
          <p className="text-xs text-blue-300 mt-1">
            Logged in as <strong>{user.full_name}</strong> ({user.role.replace("_", " ").toUpperCase()})
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md space-y-6">
          <h2 className="text-xl font-bold text-[#1E3A5F]">Select Active Session</h2>

          {sessionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-gray-400" size={28} />
            </div>
          ) : activeSessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No active sessions found. Create one in the Attendance dashboard first.
            </div>
          ) : (
            <div className="space-y-2">
              {activeSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSessionId(session.id)}
                  className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-[#1E3A5F] hover:bg-[#1E3A5F]/5 transition group"
                >
                  <p className="font-semibold text-gray-900 group-hover:text-[#1E3A5F]">
                    {session.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {session.sport_or_art ? `${session.sport_or_art} · ` : ""}
                    {format(new Date(session.scheduled_start), "MMM d, h:mm a")}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Resolved session name ─────────────────────────────────────────────────

  const activeSession = activeSessions.find((s) => s.id === selectedSessionId);

  // ── Main scan interface ───────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#1E3A5F] flex flex-col items-center justify-center p-8">
      {/* Back button */}
      <div className="absolute top-4 left-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition"
        >
          <ArrowLeft size={15} /> Dashboard
        </Link>
      </div>
      {/* Header */}
      <div className="text-center text-white mb-8">
        <h1 className="text-3xl font-bold">OSCA Attendance Scan</h1>
        <p className="text-blue-200 mt-2">NAAP-Villamor Campus</p>
        <p className="text-xs text-blue-300 mt-1">
          {user.full_name} — {user.role.replace("_", " ").toUpperCase()}
        </p>
        {activeSession && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="px-4 py-1 bg-white/20 rounded-full text-sm font-medium">
              {activeSession.name}
            </span>
            <button
              onClick={() => setSelectedSessionId(null)}
              className="flex items-center gap-1 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-xs text-blue-200 transition"
              title="Change session"
            >
              <ChevronDown size={12} /> Change
            </button>
          </div>
        )}
      </div>

      {/* Scan type toggle */}
      <div className="flex gap-3 mb-6">
        {(["time_in", "time_out"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setScanType(type)}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition ${
              scanType === type
                ? "bg-white text-[#1E3A5F]"
                : "bg-white/20 text-white hover:bg-white/30"
            }`}
          >
            {type === "time_in" ? "Time In" : "Time Out"}
          </button>
        ))}
      </div>

      {/* Webcam */}
      <div className="relative rounded-2xl overflow-hidden border-4 border-white/30 shadow-2xl">
        <Webcam
          ref={webcamRef as React.RefObject<Webcam>}
          audio={false}
          screenshotFormat="image/jpeg"
          screenshotQuality={0.9}
          width={640}
          height={480}
          videoConstraints={{
            width: 1280,
            height: 720,
            facingMode: "user",
          }}
          className="block"
        />

        {/* Scanning overlay */}
        {isScanning && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Loader2 className="text-white animate-spin" size={60} />
          </div>
        )}

        {/* Face guide oval */}
        {!isScanning && !feedback && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-60 border-4 border-white/60 rounded-full" />
          </div>
        )}
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`mt-6 px-8 py-5 rounded-2xl text-center shadow-xl ${
            feedback.type === "success"
              ? "bg-green-500"
              : feedback.type === "error"
              ? "bg-red-500"
              : "bg-yellow-500"
          } text-white`}
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            {feedback.type === "success" ? (
              <CheckCircle2 size={32} />
            ) : feedback.type === "error" ? (
              <XCircle size={32} />
            ) : (
              <AlertCircle size={32} />
            )}
            <span className="text-2xl font-bold">{feedback.message}</span>
          </div>
          {feedback.name && <p className="text-xl font-semibold">{feedback.name}</p>}
        </div>
      )}

      {/* Scan button */}
      <button
        onClick={captureAndScan}
        disabled={isScanning || !selectedSessionId}
        className="mt-8 px-16 py-5 bg-white text-[#1E3A5F] text-xl font-bold rounded-full shadow-xl hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isScanning ? "Scanning..." : "Scan Face"}
      </button>

      <p className="text-blue-200 text-sm mt-4">
        Look directly at the camera and press the button
      </p>
    </div>
  );
}
