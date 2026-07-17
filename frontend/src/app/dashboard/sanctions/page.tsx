"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sanctionsApi } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { Gavel, Plus, X, Loader2, CheckCircle } from "lucide-react";
import type { Sanction, PaginatedResponse } from "@/types";
import { format } from "date-fns";

const SEVERITY_COLORS: Record<string, string> = {
  warning: "bg-yellow-100 text-yellow-800",
  minor: "bg-orange-100 text-orange-800",
  major: "bg-red-100 text-red-800",
  severe: "bg-red-200 text-red-900",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-red-100 text-red-700",
  served: "bg-green-100 text-green-700",
  appealed: "bg-yellow-100 text-yellow-700",
  lifted: "bg-gray-100 text-gray-600",
};

export default function SanctionsPage() {
  const user = useAuthStore((s) => s.user);
  const isCoachOrAdmin = user?.role === "admin" || user?.role === "director" || user?.role === "coach" || user?.role === "staff";
  const isStudent = user?.role === "student";
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data, isLoading } = useQuery<PaginatedResponse<Sanction>>({
    queryKey: ["sanctions"],
    queryFn: async () => (await sanctionsApi.list({ page_size: 50 })).data,
  });

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => sanctionsApi.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sanctions"] }); setShowAdd(false); },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => sanctionsApi.acknowledge(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sanctions"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => sanctionsApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sanctions"] }),
  });

  const [form, setForm] = useState({ student_id: "", violation_type: "tardiness", severity: "warning", description: "", violation_date: "", start_date: "", end_date: "", penalty: "" });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Gavel size={22} className="text-[#1E3A5F]" />
          <h1 className="text-xl font-bold text-[#111827]">
            {isStudent ? "My Sanctions & Warnings" : "Sanction Monitoring"}
          </h1>
        </div>
        {isCoachOrAdmin && (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#16304f]">
            <Plus size={14} /> Issue Sanction
          </button>
        )}
      </div>

      {isStudent && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
          Below are sanctions/warnings issued to you by your coach. Please acknowledge receipt.
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-400" size={24} /></div>
      ) : (
        <div className="space-y-3">
          {data?.items.map((s) => (
            <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-[#111827] capitalize">{s.violation_type.replace("_", " ")}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_COLORS[s.severity]}`}>{s.severity}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status]}`}>{s.status}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{s.description}</p>
                  <div className="flex gap-4 text-xs text-gray-400 flex-wrap">
                    <span>📅 Violation: {s.violation_date}</span>
                    <span>⏱ Duration: {s.start_date} → {s.end_date || "ongoing"}</span>
                    {s.penalty && <span>⚖️ Penalty: {s.penalty}</span>}
                  </div>
                  {s.acknowledged_by_student && (
                    <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle size={12} /> Acknowledged {s.acknowledged_at ? format(new Date(s.acknowledged_at), "MMM d, yyyy") : ""}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  {/* Student: Acknowledge */}
                  {isStudent && !s.acknowledged_by_student && (
                    <button
                      onClick={() => acknowledgeMutation.mutate(s.id)}
                      disabled={acknowledgeMutation.isPending}
                      className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Acknowledge
                    </button>
                  )}
                  {/* Coach/Admin: Mark as served */}
                  {isCoachOrAdmin && s.status === "active" && (
                    <button
                      onClick={() => updateMutation.mutate({ id: s.id, data: { status: "served", is_compliant: true } })}
                      className="text-xs px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
                    >
                      Mark Served
                    </button>
                  )}
                  {isCoachOrAdmin && s.status === "active" && (
                    <button
                      onClick={() => updateMutation.mutate({ id: s.id, data: { status: "lifted" } })}
                      className="text-xs px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"
                    >
                      Lift
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {data?.items.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              {isStudent ? "No sanctions or warnings. Keep it up! 🎉" : "No sanctions issued yet."}
            </div>
          )}
        </div>
      )}

      {/* Add Sanction Modal — Coach/Admin only */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">Issue Sanction</h2>
              <button onClick={() => setShowAdd(false)}><X size={18} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, end_date: form.end_date || null, penalty: form.penalty || null }); }} className="space-y-3">
              <input placeholder="Student ID (UUID) *" required value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg" />
              <select value={form.violation_type} onChange={(e) => setForm({ ...form, violation_type: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg">
                <option value="tardiness">Tardiness</option>
                <option value="absence">Absence</option>
                <option value="misconduct">Misconduct</option>
                <option value="dress_code">Dress Code</option>
                <option value="equipment_misuse">Equipment Misuse</option>
                <option value="unsportsmanlike">Unsportsmanlike</option>
                <option value="substance">Substance</option>
                <option value="academic">Academic</option>
                <option value="other">Other</option>
              </select>
              <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg">
                <option value="warning">Warning</option>
                <option value="minor">Minor</option>
                <option value="major">Major</option>
                <option value="severe">Severe</option>
              </select>
              <textarea placeholder="Description *" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg" rows={3} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Violation Date *</label>
                  <input type="date" required value={form.violation_date} onChange={(e) => setForm({ ...form, violation_date: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Start Date *</label>
                  <input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg" />
                </div>
              </div>
              <input type="date" placeholder="End Date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg" />
              <input placeholder="Penalty (optional)" value={form.penalty} onChange={(e) => setForm({ ...form, penalty: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg" />
              <button type="submit" disabled={createMutation.isPending} className="w-full py-2 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {createMutation.isPending ? "Issuing..." : "Issue Sanction"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
