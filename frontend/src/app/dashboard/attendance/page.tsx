"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { attendanceApi } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { CalendarCheck, Plus, X, Loader2, Users, ClipboardList, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import type { Session, ActivityType, AttendanceRecord, PaginatedResponse } from "@/types";
import { format } from "date-fns";

// ── New Session Modal ──────────────────────────────────────────────────────────

interface SessionFormData {
  name: string;
  activity_type: ActivityType;
  sport_or_art: string;
  venue: string;
  scheduled_start: string;
  scheduled_end: string;
  notes: string;
}

const EMPTY_FORM: SessionFormData = {
  name: "",
  activity_type: "practice",
  sport_or_art: "",
  venue: "",
  scheduled_start: "",
  scheduled_end: "",
  notes: "",
};

const ACTIVITY_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: "practice",    label: "Practice" },
  { value: "training",    label: "Training" },
  { value: "competition", label: "Competition" },
  { value: "event",       label: "Event" },
  { value: "other",       label: "Other" },
];

interface NewSessionModalProps {
  onClose: () => void;
  defaultSport?: string;
}

function NewSessionModal({ onClose, defaultSport }: NewSessionModalProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SessionFormData>({
    ...EMPTY_FORM,
    ...(defaultSport ? { sport_or_art: defaultSport } : {}),
  });
  const [error, setError] = useState<string | null>(null);

  const { mutate: createSession, isPending } = useMutation({
    mutationFn: () =>
      attendanceApi.createSession({
        name: form.name,
        activity_type: form.activity_type,
        sport_or_art: form.sport_or_art || null,
        venue: form.venue || null,
        scheduled_start: new Date(form.scheduled_start).toISOString(),
        scheduled_end: new Date(form.scheduled_end).toISOString(),
        notes: form.notes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to create session. Please check all fields and try again.";
      setError(msg);
    },
  });

  const set = (field: keyof SessionFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) { setError("Session name is required."); return; }
    if (!form.scheduled_start) { setError("Start date/time is required."); return; }
    if (!form.scheduled_end)   { setError("End date/time is required."); return; }
    if (new Date(form.scheduled_end) <= new Date(form.scheduled_start)) {
      setError("End time must be after start time."); return;
    }
    createSession();
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">New Session</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Session name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Session Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={set("name")}
              placeholder="e.g. Morning Practice — Basketball"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F]"
            />
          </div>

          {/* Activity type + Sport/Art side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Activity Type <span className="text-red-500">*</span>
              </label>
              <select
                value={form.activity_type}
                onChange={set("activity_type")}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F] bg-white"
              >
                {ACTIVITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sport / Art</label>
              <input
                type="text"
                value={form.sport_or_art}
                onChange={set("sport_or_art")}
                placeholder="e.g. Basketball"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F]"
              />
            </div>
          </div>

          {/* Venue */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
            <input
              type="text"
              value={form.venue}
              onChange={set("venue")}
              placeholder="e.g. NAAP Gymnasium"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F]"
            />
          </div>

          {/* Start / End datetimes side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={form.scheduled_start}
                onChange={set("scheduled_start")}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={form.scheduled_end}
                onChange={set("scheduled_end")}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F]"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={set("notes")}
              rows={2}
              placeholder="Optional notes…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F] resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-5 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#16304f] transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isPending ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : "Create Session"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const isCoach = user?.role === "coach";
  const isStudent = user?.role === "student";
  const userSport = user?.sport_or_art ?? undefined;
  const [page, setPage] = useState(1);
  const [showNewSession, setShowNewSession] = useState(false);
  const [activeTab, setActiveTab] = useState<"sessions" | "history">("sessions");

  const { data, isLoading } = useQuery<PaginatedResponse<Session>>({
    queryKey: ["sessions", page, userSport, isStudent],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, page_size: 20 };
      if ((isCoach || isStudent) && userSport) params.sport = userSport;
      const res = await attendanceApi.listSessions(params);
      return res.data;
    },
  });

  // Student: fetch own attendance history
  const { data: historyData, isLoading: historyLoading } = useQuery<PaginatedResponse<AttendanceRecord>>({
    queryKey: ["my-attendance", user?.id],
    queryFn: async () => {
      const res = await attendanceApi.getRecords({ student_id: user!.id, page_size: 50 });
      return res.data;
    },
    enabled: isStudent && !!user?.id,
  });

  const activityColors: Record<string, string> = {
    practice:    "bg-blue-100 text-blue-800",
    competition: "bg-red-100 text-red-800",
    training:    "bg-green-100 text-green-800",
    event:       "bg-purple-100 text-purple-800",
    other:       "bg-gray-100 text-gray-800",
  };

  const totalPages = data?.pages ?? 1;

  return (
    <>
      {showNewSession && <NewSessionModal onClose={() => setShowNewSession(false)} defaultSport={userSport} />}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
            <p className="text-sm text-gray-500">
              {(isCoach || isStudent) && userSport
                ? `Sessions for ${userSport}`
                : "Manage sessions and view attendance records"}
            </p>
          </div>
          <div className="flex gap-2">
            {isCoach && (
              <Link
                href="/dashboard/attendance/roster"
                className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <Users size={16} /> Player Roster
              </Link>
            )}
            {!isStudent && (
              <button
                onClick={() => setShowNewSession(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#16304f] transition"
              >
                <Plus size={16} /> New Session
              </button>
            )}
          </div>
        </div>

        {/* Student tabs */}
        {isStudent && (
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab("sessions")}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-md font-medium transition ${
                activeTab === "sessions" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <CalendarCheck size={14} /> Sessions
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-md font-medium transition ${
                activeTab === "history" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <ClipboardList size={14} /> My Attendance
            </button>
          </div>
        )}

        {/* ── Sessions tab (default for all, or when tab = sessions) ── */}
        {(!isStudent || activeTab === "sessions") && (
          <>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#1E3A5F] text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Session Name</th>
                    <th className="px-4 py-3 text-left font-medium">Activity</th>
                    <th className="px-4 py-3 text-left font-medium">Sport/Art</th>
                    <th className="px-4 py-3 text-left font-medium">Date & Time</th>
                    <th className="px-4 py-3 text-center font-medium">Attendance</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                    <th className="px-4 py-3 text-center font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                        <Loader2 size={20} className="animate-spin inline-block mr-2" />Loading…
                      </td>
                    </tr>
                  ) : (data?.items ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">
                        No sessions yet.{!isStudent && (
                          <button onClick={() => setShowNewSession(true)} className="ml-1 text-[#1E3A5F] underline underline-offset-2">
                            Create the first one.
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (data?.items ?? []).map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <CalendarCheck size={16} className="text-gray-400" />
                          {session.name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${activityColors[session.activity_type] ?? ""}`}>
                          {session.activity_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{session.sport_or_art ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {format(new Date(session.scheduled_start), "MMM d, yyyy · h:mm a")}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-[#1E3A5F]">
                        {session.attendance_count}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${session.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
                          {session.is_active ? "Active" : "Closed"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isStudent ? (
                          <button
                            onClick={() => router.push(`/dashboard/attendance/${session.id}/scan`)}
                            className="px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                          >
                            Scan In
                          </button>
                        ) : (
                          <button
                            onClick={() => router.push(`/dashboard/attendance/${session.id}`)}
                            className="px-3 py-1 text-xs bg-[#1E3A5F] text-white rounded-lg hover:bg-[#16304f] transition"
                          >
                            Monitor
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                  Previous
                </button>
                <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* ── My Attendance History tab (students only) ── */}
        {isStudent && activeTab === "history" && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#1E3A5F] text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Session</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 text-center font-medium">Time In</th>
                  <th className="px-4 py-3 text-center font-medium">Time Out</th>
                  <th className="px-4 py-3 text-center font-medium">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {historyLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      <Loader2 size={20} className="animate-spin inline-block mr-2" />Loading…
                    </td>
                  </tr>
                ) : (historyData?.items ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">
                      No attendance records yet. Scan in to a session to record attendance.
                    </td>
                  </tr>
                ) : (historyData?.items ?? []).map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <CalendarCheck size={14} className="text-gray-400" />
                        {record.student_name || "Session"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {record.time_in ? format(new Date(record.time_in), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {record.time_in ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle2 size={11} /> Present
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircle size={11} /> Absent
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-600">
                      {record.time_in ? format(new Date(record.time_in), "h:mm a") : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-600">
                      {record.time_out ? format(new Date(record.time_out), "h:mm a") : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-600">
                      {record.duration_minutes ? `${record.duration_minutes} min` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
