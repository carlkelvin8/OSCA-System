"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { eligibilityApi, usersApi } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { ShieldCheck, Plus, X, Loader2 } from "lucide-react";
import type { AthleteEligibility, PaginatedResponse, UserSummary } from "@/types";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  eligible: "bg-green-100 text-green-800",
  restricted: "bg-yellow-100 text-yellow-800",
  ineligible: "bg-red-100 text-red-800",
  pending_clearance: "bg-orange-100 text-orange-800",
};

export default function EligibilityPage() {
  const user = useAuthStore((s) => s.user);
  const isStaff = user?.role === "admin" || user?.role === "director" || user?.role === "coach" || user?.role === "staff";
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data, isLoading } = useQuery<PaginatedResponse<AthleteEligibility>>({
    queryKey: ["eligibility"],
    queryFn: async () => (await eligibilityApi.list({ page_size: 50, current_only: true })).data,
  });

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => eligibilityApi.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["eligibility"] }); setShowAdd(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => eligibilityApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["eligibility"] }),
  });

  const [form, setForm] = useState({ student_id: "", status: "restricted", reason_type: "injury", reason_detail: "", start_date: "", end_date: "", notes: "" });

  // Fetch students for dropdown
  const { data: studentsData } = useQuery<PaginatedResponse<UserSummary>>({
    queryKey: ["students-list"],
    queryFn: async () => (await usersApi.list({ role: "student", page_size: 100, is_active: true })).data,
    enabled: isStaff,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShieldCheck size={22} className="text-[#1E3A5F]" />
          <h1 className="text-xl font-bold text-[#111827]">Athlete Eligibility</h1>
        </div>
        {isStaff && (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#16304f]">
            <Plus size={14} /> Add Record
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-400" size={24} /></div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Student ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Reason</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Period</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Clearance</th>
                {isStaff && <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {data?.items.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{r.student_id.slice(0, 8)}...</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status]}`}>
                      {r.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {r.reason_type && <span className="capitalize">{r.reason_type}</span>}
                    {r.reason_detail && <span className="text-xs text-gray-400 ml-1">— {r.reason_detail}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {r.start_date} {r.end_date ? `→ ${r.end_date}` : "(ongoing)"}
                  </td>
                  <td className="px-4 py-3">
                    {r.medical_clearance ? (
                      <span className="text-xs text-green-600 font-medium">✓ Cleared</span>
                    ) : (
                      <span className="text-xs text-gray-400">Pending</span>
                    )}
                  </td>
                  {isStaff && (
                    <td className="px-4 py-3">
                      {!r.medical_clearance && (
                        <button
                          onClick={() => updateMutation.mutate({ id: r.id, data: { medical_clearance: true, status: "eligible", is_current: false } })}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Grant Clearance
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {data?.items.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">No eligibility records.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">Add Eligibility Record</h2>
              <button onClick={() => setShowAdd(false)}><X size={18} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-3">
              <select required value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg">
                <option value="">-- Select Student --</option>
                {studentsData?.items.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>
                ))}
              </select>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg">
                <option value="eligible">Eligible</option>
                <option value="restricted">Restricted</option>
                <option value="ineligible">Ineligible</option>
                <option value="pending_clearance">Pending Clearance</option>
              </select>
              <select value={form.reason_type} onChange={(e) => setForm({ ...form, reason_type: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg">
                <option value="injury">Injury</option>
                <option value="medical">Medical</option>
                <option value="disciplinary">Disciplinary</option>
                <option value="academic">Academic</option>
                <option value="other">Other</option>
              </select>
              <input placeholder="Detail" value={form.reason_detail} onChange={(e) => setForm({ ...form, reason_detail: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg" />
              <input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg" />
              <input type="date" placeholder="End Date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg" />
              <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg" rows={2} />
              <button type="submit" disabled={createMutation.isPending} className="w-full py-2 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {createMutation.isPending ? "Saving..." : "Create Record"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
