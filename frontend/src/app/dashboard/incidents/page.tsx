"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { incidentsApi } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { AlertTriangle, Plus, X, Loader2 } from "lucide-react";
import type { Incident, PaginatedResponse } from "@/types";
import { format } from "date-fns";

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-700",
  under_review: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

export default function IncidentsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const isStaff = role === "admin" || role === "director" || role === "coach" || role === "staff";
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data, isLoading } = useQuery<PaginatedResponse<Incident>>({
    queryKey: ["incidents"],
    queryFn: async () => (await incidentsApi.list({ page_size: 50 })).data,
  });

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => incidentsApi.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["incidents"] }); setShowAdd(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => incidentsApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["incidents"] }),
  });

  const [form, setForm] = useState({ title: "", description: "", category: "behavioral", severity: "medium", incident_date: "", location: "", involved_student_id: "" });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <AlertTriangle size={22} className="text-[#1E3A5F]" />
          <h1 className="text-xl font-bold text-[#111827]">Incident Reports</h1>
        </div>
        {isStaff && (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#16304f]">
            <Plus size={14} /> Report Incident
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-400" size={24} /></div>
      ) : (
        <div className="space-y-3">
          {data?.items.map((inc) => (
            <div key={inc.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-[#111827]">{inc.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_COLORS[inc.severity]}`}>{inc.severity}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[inc.status]}`}>{inc.status.replace("_", " ")}</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{inc.description}</p>
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>📁 {inc.category.replace("_", " ")}</span>
                    <span>📅 {format(new Date(inc.incident_date), "MMM d, yyyy")}</span>
                    {inc.location && <span>📍 {inc.location}</span>}
                  </div>
                </div>
                {isStaff && inc.status === "open" && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => updateMutation.mutate({ id: inc.id, data: { status: "under_review" } })}
                      className="text-xs px-3 py-1 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100"
                    >
                      Review
                    </button>
                    <button
                      onClick={() => updateMutation.mutate({ id: inc.id, data: { status: "resolved", resolution: "Resolved by admin" } })}
                      className="text-xs px-3 py-1 bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
                    >
                      Resolve
                    </button>
                  </div>
                )}
              </div>
              {inc.resolution && (
                <div className="mt-3 p-2 bg-green-50 rounded-lg text-xs text-green-700">
                  <strong>Resolution:</strong> {inc.resolution}
                </div>
              )}
            </div>
          ))}
          {data?.items.length === 0 && (
            <div className="text-center py-12 text-gray-400">No incidents reported.</div>
          )}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">Report Incident</h2>
              <button onClick={() => setShowAdd(false)}><X size={18} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, incident_date: new Date(form.incident_date).toISOString(), involved_student_id: form.involved_student_id || null }); }} className="space-y-3">
              <input placeholder="Title *" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg" />
              <textarea placeholder="Description *" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg" rows={3} />
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg">
                <option value="injury">Injury</option>
                <option value="equipment_damage">Equipment Damage</option>
                <option value="facility_damage">Facility Damage</option>
                <option value="behavioral">Behavioral</option>
                <option value="safety">Safety</option>
                <option value="other">Other</option>
              </select>
              <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <input type="datetime-local" required value={form.incident_date} onChange={(e) => setForm({ ...form, incident_date: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg" />
              <input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg" />
              <input placeholder="Involved Student ID (optional)" value={form.involved_student_id} onChange={(e) => setForm({ ...form, involved_student_id: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg" />
              <button type="submit" disabled={createMutation.isPending} className="w-full py-2 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {createMutation.isPending ? "Submitting..." : "Submit Report"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
