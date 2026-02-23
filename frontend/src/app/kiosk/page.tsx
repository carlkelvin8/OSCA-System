"use client";

/**
 * Kiosk Mode — full-screen attendance scanning interface.
 * Runs on the dedicated kiosk PC in the OSCA room.
 * Students stand in front of the webcam; system auto-scans and displays result.
 */
import { useState } from "react";
import Webcam from "react-webcam";
import { useFacialRecognition } from "@/hooks/useFacialRecognition";
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import type { FaceScanResponse } from "@/types";

// Kiosk is configured with a session ID (set by Admin before kiosk session starts)
// In production, read from URL params or local config
const DEMO_SESSION_ID = "00000000-0000-0000-0000-000000000000";

export default function KioskPage() {
  const [scanType, setScanType] = useState<"time_in" | "time_out">("time_in");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "warning";
    message: string;
    name?: string;
  } | null>(null);

  const { webcamRef, isScanning, captureAndScan } = useFacialRecognition({
    sessionId: DEMO_SESSION_ID,
    scanType,
    onSuccess: (result: FaceScanResponse) => {
      setFeedback({
        type: "success",
        message: scanType === "time_in" ? "Time-In Recorded!" : "Time-Out Recorded!",
        name: result.matched_user_name ?? undefined,
      });
      setTimeout(() => setFeedback(null), 4000);
    },
    onFailure: (result: FaceScanResponse) => {
      setFeedback({
        type: "error",
        message: result.message || "Recognition failed. Please try again.",
      });
      setTimeout(() => setFeedback(null), 4000);
    },
  });

  return (
    <div className="min-h-screen bg-[#1E3A5F] flex flex-col items-center justify-center p-8">
      {/* Header */}
      <div className="text-center text-white mb-8">
        <h1 className="text-3xl font-bold">OSCA Attendance Kiosk</h1>
        <p className="text-blue-200 mt-2">NAAP-Villamor Campus</p>
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

        {/* Face guide overlay */}
        {!isScanning && !feedback && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-60 border-4 border-white/60 rounded-full" />
          </div>
        )}
      </div>

      {/* Feedback overlay */}
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
          {feedback.name && (
            <p className="text-xl font-semibold">{feedback.name}</p>
          )}
        </div>
      )}

      {/* Scan button */}
      <button
        onClick={captureAndScan}
        disabled={isScanning}
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
