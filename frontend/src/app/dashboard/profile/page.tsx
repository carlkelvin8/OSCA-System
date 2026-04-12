"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { inventoryApi } from "@/lib/api";
import { User as UserIcon, Mail, Shield, Calendar, Activity, QrCode } from "lucide-react";
import { format } from "date-fns";
import QRCode from "qrcode";

export default function ProfilePage() {
  const { user } = useAuthStore();
  const hasBorrowingQR = user?.role === "coach" || user?.role === "pe_instructor";
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const { data: borrowingId } = useQuery({
    queryKey: ["borrowing-id-me"],
    queryFn: async () => {
      const res = await inventoryApi.getMyBorrowingId();
      return res.data as { qr_code: string; is_active: boolean };
    },
    enabled: hasBorrowingQR,
    retry: false,
  });

  useEffect(() => {
    if (borrowingId?.qr_code) {
      QRCode.toDataURL(borrowingId.qr_code, { width: 200, margin: 2 })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(null));
    }
  }, [borrowingId?.qr_code]);

  if (!user) return null;

  const roleLabel: Record<string, string> = {
    admin: "System Administrator",
    director: "OSCA Director",
    coach: "Coach",
    pe_instructor: "PE Instructor",
    student: "Student",
  };

  const initials =
    (user.first_name?.[0] ?? "") + (user.last_name?.[0] ?? "");

  const infoRows: { label: string; value: string | null; icon: React.ElementType }[] = [
    { label: "Email", value: user.email, icon: Mail },
    { label: "Role", value: roleLabel[user.role] ?? user.role, icon: Shield },
    { label: "Sport / Art", value: user.sport_or_art, icon: Activity },
    { label: "Course", value: user.course, icon: UserIcon },
    { label: "Year Level", value: user.year_level, icon: UserIcon },
    { label: "Student ID", value: user.student_id, icon: UserIcon },
    {
      label: "Member Since",
      value: user.created_at ? format(new Date(user.created_at), "MMMM d, yyyy") : null,
      icon: Calendar,
    },
    {
      label: "Last Login",
      value: user.last_login_at
        ? format(new Date(user.last_login_at), "MMM d, yyyy 'at' h:mm a")
        : null,
      icon: Calendar,
    },
  ];

  // Only show rows that have a value
  const visibleRows = infoRows.filter((r) => r.value);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500">Your account information</p>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Header banner */}
        <div className="h-24 bg-gradient-to-r from-[#1E3A5F] to-[#2563eb]" />

        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="-mt-12 mb-4">
            <div className="w-24 h-24 rounded-full bg-[#1E3A5F] border-4 border-white flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {initials.toUpperCase() || "?"}
            </div>
          </div>

          <h2 className="text-xl font-bold text-gray-900">{user.full_name}</h2>
          <p className="text-sm text-gray-500">{roleLabel[user.role] ?? user.role}</p>
          {user.sport_or_art && (
            <span className="inline-block mt-2 px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              {user.sport_or_art}
            </span>
          )}
        </div>
      </div>

      {/* Info table */}
      <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
        {visibleRows.map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.label} className="flex items-center gap-3 px-6 py-4">
              <Icon size={16} className="text-gray-400 shrink-0" />
              <span className="text-sm text-gray-500 w-32 shrink-0">{row.label}</span>
              <span className="text-sm font-medium text-gray-900">{row.value}</span>
            </div>
          );
        })}
      </div>

      {/* Borrowing QR — Coach / PE Instructor only */}
      {hasBorrowingQR && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <QrCode size={18} className="text-[#1E3A5F]" />
            <h2 className="text-sm font-semibold text-gray-900">Borrowing ID QR Code</h2>
          </div>
          {qrDataUrl ? (
            <div className="flex flex-col items-center gap-3">
              <img src={qrDataUrl} alt="Borrowing QR Code" className="w-40 h-40 rounded-lg border border-gray-100" />
              <p className="text-xs text-gray-500 text-center">
                Present this QR code when borrowing equipment from the OSCA office.
              </p>
              <button
                onClick={() => {
                  const win = window.open("", "_blank", "width=400,height=500");
                  win?.document.write(
                    `<html><body style="text-align:center;padding:20px;font-family:sans-serif">
                    <h2>Borrowing ID — ${user.full_name}</h2>
                    <img src="${qrDataUrl}" style="width:200px"/>
                    <p style="font-size:12px;color:#666">${user.role.replace("_"," ").toUpperCase()} · ${user.sport_or_art ?? ""}</p>
                    <script>window.print()</script></body></html>`
                  );
                }}
                className="px-4 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                Print QR
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">
              No Borrowing ID issued yet. Contact the OSCA administrator to generate one.
            </p>
          )}
        </div>
      )}

      {/* Status badges */}
      <div className="flex flex-wrap gap-3">
        <span
          className={`px-3 py-1.5 text-xs font-medium rounded-full ${
            user.is_active
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {user.is_active ? "Active" : "Inactive"}
        </span>
        <span
          className={`px-3 py-1.5 text-xs font-medium rounded-full ${
            user.is_face_enrolled
              ? "bg-blue-100 text-blue-800"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {user.is_face_enrolled ? "Face Enrolled" : "Not Enrolled"}
        </span>
        {user.biometric_consent && (
          <span className="px-3 py-1.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
            Biometric Consent Given
          </span>
        )}
      </div>
    </div>
  );
}
