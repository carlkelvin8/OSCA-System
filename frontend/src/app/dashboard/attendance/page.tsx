"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { attendanceApi } from "@/lib/api";
import { CalendarCheck, Plus } from "lucide-react";
import type { Session, PaginatedResponse } from "@/types";
import { format } from "date-fns";

export default function AttendancePage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<PaginatedResponse<Session>>({
    queryKey: ["sessions", page],
    queryFn: async () => {
      const res = await attendanceApi.listSessions({ page, page_size: 20 });
      return res.data;
    },
  });

  const activityColors: Record<string, string> = {
    practice: "bg-blue-100 text-blue-800",
    competition: "bg-red-100 text-red-800",
    training: "bg-green-100 text-green-800",
    event: "bg-purple-100 text-purple-800",
    other: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-sm text-gray-500">Manage sessions and view attendance records</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#16304f]">
          <Plus size={16} /> New Session
        </button>
      </div>

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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td>
              </tr>
            ) : (data?.items ?? []).map((session) => (
              <tr key={session.id} className="hover:bg-gray-50 cursor-pointer">
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
