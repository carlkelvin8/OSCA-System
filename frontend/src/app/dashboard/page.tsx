"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reportsApi, announcementsApi, usersApi } from "@/lib/api";
import { Users, CheckCircle, Package, AlertTriangle, Plus, Pencil, Trash2, Calendar, X, Loader2, Clock } from "lucide-react";
import type { UserSummary } from "@/types";
import type { DashboardSummary, Announcement, PaginatedResponse } from "@/types";
import { useAuthStore } from "@/store/useAuthStore";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ── Announcement Form Modal ────────────────────────────────────────────────────

interface AnnouncementFormProps {
  existing?: Announcement;
  onClose: () => void;
}

function AnnouncementFormModal({ existing, onClose }: AnnouncementFormProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [content, setContent] = useState(existing?.content ?? "");
  const [eventDate, setEventDate] = useState(
    existing?.event_date
      ? format(new Date(existing.event_date), "yyyy-MM-dd'T'HH:mm")
      : ""
  );
  const [error, setError] = useState<string | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        title,
        content,
        event_date: eventDate ? new Date(eventDate).toISOString() : null,
      };
      return existing
        ? announcementsApi.update(existing.id, payload)
        : announcementsApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to save announcement.";
      setError(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) { setError("Title is required."); return; }
    if (!content.trim()) { setError("Content is required."); return; }
    mutate();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {existing ? "Edit Announcement" : "New Announcement"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Announcement title"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              placeholder="Announcement content…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F] resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Date <span className="text-gray-400 font-normal">(optional — leave blank for general notice)</span>
            </label>
            <input
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F]"
            />
          </div>
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-5 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#16304f] transition disabled:opacity-50 font-medium"
            >
              {isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Dashboard Page ────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [announcementModal, setAnnouncementModal] = useState<"new" | Announcement | null>(null);

  const { data: summary, isLoading } = useQuery<DashboardSummary>({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const res = await reportsApi.dashboardSummary();
      return res.data;
    },
    refetchInterval: 30_000,
  });

  const { data: announcementsData } = useQuery<PaginatedResponse<Announcement>>({
    queryKey: ["announcements"],
    queryFn: async () => {
      const res = await announcementsApi.list({ page_size: 10 });
      return res.data;
    },
    refetchInterval: 60_000,
  });

  const { mutate: deleteAnnouncement } = useMutation({
    mutationFn: (id: string) => announcementsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements"] }),
  });

  // Staff: fetch pending account count for dashboard card
  const { data: pendingData } = useQuery<PaginatedResponse<UserSummary>>({
    queryKey: ["users", "pending-count"],
    queryFn: async () => {
      const res = await usersApi.list({ page: 1, page_size: 1, is_active: false });
      return res.data;
    },
    enabled: user?.role === "staff" || user?.role === "admin" || user?.role === "director",
    refetchInterval: 30_000,
  });
  const pendingCount = pendingData?.total ?? 0;

  const isEditor = user?.role === "admin" || user?.role === "director";
  const announcements = announcementsData?.items ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1E3A5F]" />
      </div>
    );
  }

  const role = user?.role;

  const allStats = [
    {
      key: "pending",
      label: "Pending Accounts",
      value: pendingCount,
      sub: "Accounts awaiting approval",
      icon: Clock,
      color: pendingCount > 0 ? "bg-amber-500" : "bg-gray-400",
    },
    {
      key: "students",
      label: "Total Students",
      value: summary?.students.total ?? 0,
      sub: `${summary?.students.face_enrolled ?? 0} face-enrolled (${summary?.students.enrollment_rate ?? 0}%)`,
      icon: Users,
      color: "bg-blue-500",
    },
    {
      key: "attendance",
      label: "Attendance Today",
      value: summary?.attendance.today ?? 0,
      sub: role === "coach" && user?.sport_or_art
        ? `Scans recorded today · ${user.sport_or_art}`
        : "Scans recorded today",
      icon: CheckCircle,
      color: "bg-green-500",
    },
    {
      key: "equipment",
      label: "Equipment Available",
      value: summary?.equipment.available ?? 0,
      sub: `${summary?.equipment.borrowed ?? 0} currently borrowed`,
      icon: Package,
      color: "bg-indigo-500",
    },
    {
      key: "overdue",
      label: "Overdue Returns",
      value: summary?.transactions.overdue ?? 0,
      sub: "Transactions past due",
      icon: AlertTriangle,
      color: summary?.transactions.overdue ? "bg-red-500" : "bg-gray-400",
    },
  ];

  // Student: only equipment available + attendance
  // PE Instructor: only equipment + overdue stats
  // Coach: attendance + equipment + overdue (sport-specific label)
  // Staff: equipment + overdue (inventory-focused)
  // Admin/Director: all stats
  const stats = allStats.filter((s) => {
    if (role === "student") return s.key === "equipment" || s.key === "attendance";
    if (role === "pe_instructor") return s.key === "equipment" || s.key === "overdue";
    if (role === "coach") return s.key !== "students" && s.key !== "pending";
    if (role === "staff") return s.key === "pending" || s.key === "equipment" || s.key === "overdue";
    return true; // admin, director see all
  });

  const equipmentChartData = summary
    ? [
        { name: "Available", qty: summary.equipment.available, fill: "#22c55e" },
        { name: "Borrowed", qty: summary.equipment.borrowed, fill: "#6366f1" },
      ]
    : [];

  return (
    <>
      {announcementModal && (
        <AnnouncementFormModal
          existing={announcementModal === "new" ? undefined : announcementModal}
          onClose={() => setAnnouncementModal(null)}
        />
      )}

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">OSCA Attendance & Inventory Overview</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white rounded-xl shadow-sm p-6 flex items-start gap-4">
                <div className={`${stat.color} p-3 rounded-xl text-white`}>
                  <Icon size={22} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm font-medium text-gray-700">{stat.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom grid: chart + announcements */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Equipment chart */}
          <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-3">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Equipment Status</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={equipmentChartData} barCategoryGap="40%">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="qty" fill="#1E3A5F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Announcements & Events */}
          <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-800">Upcoming Events & Notices</h2>
              {isEditor && (
                <button
                  onClick={() => setAnnouncementModal("new")}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[#1E3A5F] text-white rounded-lg hover:bg-[#16304f] transition font-medium"
                >
                  <Plus size={12} /> Add
                </button>
              )}
            </div>

            {announcements.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No announcements yet.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {announcements.map((ann) => (
                  <div key={ann.id} className="group p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 leading-tight">{ann.title}</p>
                      {isEditor && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                          <button
                            onClick={() => setAnnouncementModal(ann)}
                            className="p-1 hover:bg-gray-200 rounded text-gray-500"
                            title="Edit"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => deleteAnnouncement(ann.id)}
                            className="p-1 hover:bg-red-100 rounded text-red-400"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ann.content}</p>
                    {ann.event_date && (
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-[#1E3A5F] font-medium">
                        <Calendar size={11} />
                        {format(new Date(ann.event_date), "MMM d, yyyy · h:mm a")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-400 text-right">
          Last updated:{" "}
          {summary ? new Date(summary.generated_at).toLocaleString("en-PH") : "—"}
        </p>
      </div>
    </>
  );
}
