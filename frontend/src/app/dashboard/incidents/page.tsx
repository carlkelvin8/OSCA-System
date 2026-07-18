"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { incidentsApi, usersApi } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { AlertTriangle, Plus, X, Loader2, Search, Download, FileText, CheckSquare } from "lucide-react";
import type { Incident, PaginatedResponse, UserSummary } from "@/types";
import { format } from "date-fns";
import { exportToCSV, exportToPrintPDF } from "@/lib/exportUtils";

const SEVERITY_COLORS: Record<string, string> = { low: "bg-blue-100 text-blue-800", medium: "bg-yellow-100 text-yellow-800", high: "bg-orange-100 text-orange-800", critical: "bg-red-100 text-red-800" };
const STATUS_COLORS: Record<string, string> = { open: "bg-red-100 text-red-700", under_review: "bg-yellow-100 text-yellow-700", resolved: "bg-green-100 text-green-700", closed: "bg-gray-100 text-gray-600" };

export default function IncidentsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const isStaff = role === "admin" || role === "director" || role === "coach" || role === "staff";
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery<PaginatedResponse<Incident>>({ queryKey: ["incidents"], queryFn: async () => (await incidentsApi.list({ page_size: 100 })).data });
  const createMutation = useMutation({ mutationFn: (d: Record<string, unknown>) => incidentsApi.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["incidents"] }); setShowAdd(false); } });
  const updateMutation = useMutation({ mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => incidentsApi.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["incidents"] }); setSelected(new Set()); } });

  const bulkResolveMutation = useMutation({
    mutationFn: async () => { for (const id of selected) await incidentsApi.update(id, { status: "resolved", resolution: "Bulk resolved by admin" }); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["incidents"] }); setSelected(new Set()); },
  });

  const { data: studentsData } = useQuery<PaginatedResponse<UserSummary>>({ queryKey: ["students-list"], queryFn: async () => (await usersApi.list({ role: "student", page_size: 100, is_active: true })).data, enabled: isStaff });
  const [form, setForm] = useState({ title: "", description: "", category: "behavioral", severity: "medium", incident_date: "", location: "", involved_student_id: "" });

  const items = (data?.items ?? []).filter((inc) => {
    if (statusFilter && inc.status !== statusFilter) return false;
    if (categoryFilter && inc.category !== categoryFilter) return false;
    if (search) { const q = search.toLowerCase(); return inc.title.toLowerCase().includes(q) || inc.description.toLowerCase().includes(q) || (inc.location?.toLowerCase().includes(q) ?? false); }
    return true;
  });

  const toggleSelect = (id: string) => { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s); };
  const toggleAll = () => { selected.size === items.length ? setSelected(new Set()) : setSelected(new Set(items.map((r) => r.id))); };
  const handleExportCSV = () => { exportToCSV(items.map((i) => ({ title: i.title, category: i.category, severity: i.severity, status: i.status, date: i.incident_date, location: i.location ?? "" })), "incidents"); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3"><AlertTriangle size={22} className="text-[#1E3A5F]" /><h1 className="text-xl font-bold text-[#111827]">Incident Reports</h1></div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-3 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50"><Download size={13} /> CSV</button>
          <button onClick={() => exportToPrintPDF("Incident Reports")} className="flex items-center gap-1.5 px-3 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50"><FileText size={13} /> PDF</button>
          {isStaff && <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#16304f]"><Plus size={14} /> Report Incident</button>}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, description..." className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20" /></div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"><option value="">All Status</option><option value="open">Open</option><option value="under_review">Under Review</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"><option value="">All Categories</option><option value="injury">Injury</option><option value="equipment_damage">Equipment Damage</option><option value="facility_damage">Facility Damage</option><option value="behavioral">Behavioral</option><option value="safety">Safety</option><option value="other">Other</option></select>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && isStaff && (
        <div className="flex items-center gap-3 mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <CheckSquare size={16} className="text-blue-600" /><span className="text-sm text-blue-700 font-medium">{selected.size} selected</span>
          <button onClick={() => bulkResolveMutation.mutate()} disabled={bulkResolveMutation.isPending} className="ml-auto px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">{bulkResolveMutation.isPending ? "Processing..." : "Bulk Resolve"}</button>
          <button onClick={() => setSelected(new Set())} className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">Clear</button>
        </div>
      )}

      {isLoading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-400" size={24} /></div> : (
        <div className="space-y-3" data-export-table>
          {items.map((inc) => (
            <div key={inc.id} className={`bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition ${selected.has(inc.id) ? "ring-2 ring-blue-300" : ""}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {isStaff && <input type="checkbox" checked={selected.has(inc.id)} onChange={() => toggleSelect(inc.id)} className="rounded mt-1" />}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                </div>
                {isStaff && inc.status === "open" && (
                  <div className="flex gap-2 ml-4 shrink-0">
                    <button onClick={() => updateMutation.mutate({ id: inc.id, data: { status: "under_review" } })} className="text-xs px-3 py-1 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100">Review</button>
                    <button onClick={() => updateMutation.mutate({ id: inc.id, data: { status: "resolved", resolution: "Resolved" } })} className="text-xs px-3 py-1 bg-green-50 text-green-700 rounded-lg hover:bg-green-100">Resolve</button>
                  </div>
                )}
              </div>
              {inc.resolution && <div className="mt-3 p-2 bg-green-50 rounded-lg text-xs text-green-700"><strong>Resolution:</strong> {inc.resolution}</div>}
            </div>
          ))}
          {items.length === 0 && <div className="text-center py-12 text-gray-400">No incidents found.</div>}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4"><h2 className="font-bold text-lg">Report Incident</h2><button onClick={() => setShowAdd(false)}><X size={18} /></button></div>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, incident_date: new Date(form.incident_date).toISOString(), involved_student_id: form.involved_student_id || null }); }} className="space-y-3">
              <input placeholder="Title *" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg" />
              <textarea placeholder="Description *" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg" rows={3} />
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg"><option value="injury">Injury</option><option value="equipment_damage">Equipment Damage</option><option value="facility_damage">Facility Damage</option><option value="behavioral">Behavioral</option><option value="safety">Safety</option><option value="other">Other</option></select>
              <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select>
              <input type="datetime-local" required value={form.incident_date} onChange={(e) => setForm({ ...form, incident_date: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg" />
              <input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg" />
              <select value={form.involved_student_id} onChange={(e) => setForm({ ...form, involved_student_id: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg"><option value="">-- Involved Student (optional) --</option>{studentsData?.items.map((s) => (<option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>))}</select>
              <button type="submit" disabled={createMutation.isPending} className="w-full py-2 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium disabled:opacity-50">{createMutation.isPending ? "Submitting..." : "Submit Report"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
