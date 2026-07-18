"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sanctionsApi, usersApi } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { Gavel, Plus, X, Loader2, CheckCircle, Search, Download, FileText, CheckSquare } from "lucide-react";
import type { Sanction, PaginatedResponse, UserSummary } from "@/types";
import { format } from "date-fns";
import { exportToCSV, exportToPrintPDF } from "@/lib/exportUtils";

const SEVERITY_COLORS: Record<string, string> = { warning: "bg-yellow-100 text-yellow-800", minor: "bg-orange-100 text-orange-800", major: "bg-red-100 text-red-800", severe: "bg-red-200 text-red-900" };
const STATUS_COLORS: Record<string, string> = { active: "bg-red-100 text-red-700", served: "bg-green-100 text-green-700", appealed: "bg-yellow-100 text-yellow-700", lifted: "bg-gray-100 text-gray-600" };

export default function SanctionsPage() {
  const user = useAuthStore((s) => s.user);
  const isCoachOrAdmin = user?.role === "admin" || user?.role === "director" || user?.role === "coach" || user?.role === "staff";
  const isStudent = user?.role === "student";
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [violationFilter, setViolationFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery<PaginatedResponse<Sanction>>({ queryKey: ["sanctions"], queryFn: async () => (await sanctionsApi.list({ page_size: 100 })).data });
  const createMutation = useMutation({ mutationFn: (d: Record<string, unknown>) => sanctionsApi.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sanctions"] }); setShowAdd(false); } });
  const acknowledgeMutation = useMutation({ mutationFn: (id: string) => sanctionsApi.acknowledge(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sanctions"] }) });
  const updateMutation = useMutation({ mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => sanctionsApi.update(id, data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sanctions"] }) });

  const bulkServedMutation = useMutation({
    mutationFn: async () => { for (const id of selected) await sanctionsApi.update(id, { status: "served", is_compliant: true }); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sanctions"] }); setSelected(new Set()); },
  });

  const { data: studentsData } = useQuery<PaginatedResponse<UserSummary>>({ queryKey: ["students-list"], queryFn: async () => (await usersApi.list({ role: "student", page_size: 100, is_active: true })).data, enabled: isCoachOrAdmin });
  const [form, setForm] = useState({ student_id: "", violation_type: "tardiness", severity: "warning", description: "", violation_date: "", start_date: "", end_date: "", penalty: "" });

  const items = (data?.items ?? []).filter((s) => {
    if (statusFilter && s.status !== statusFilter) return false;
    if (violationFilter && s.violation_type !== violationFilter) return false;
    if (search) { const q = search.toLowerCase(); return s.description.toLowerCase().includes(q) || s.violation_type.toLowerCase().includes(q) || (s.penalty?.toLowerCase().includes(q) ?? false); }
    return true;
  });

  const toggleSelect = (id: string) => { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s); };
  const toggleAll = () => { selected.size === items.length ? setSelected(new Set()) : setSelected(new Set(items.map((r) => r.id))); };
  const handleExportCSV = () => { exportToCSV(items.map((s) => ({ violation_type: s.violation_type, severity: s.severity, status: s.status, description: s.description, violation_date: s.violation_date, start_date: s.start_date, end_date: s.end_date ?? "", penalty: s.penalty ?? "", acknowledged: s.acknowledged_by_student ? "Yes" : "No" })), "sanctions"); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3"><Gavel size={22} className="text-[#1E3A5F]" /><h1 className="text-xl font-bold text-[#111827]">{isStudent ? "My Sanctions & Warnings" : "Sanction Monitoring"}</h1></div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-3 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50"><Download size={13} /> CSV</button>
          <button onClick={() => exportToPrintPDF("Sanctions Report")} className="flex items-center gap-1.5 px-3 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50"><FileText size={13} /> PDF</button>
          {isCoachOrAdmin && <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#16304f]"><Plus size={14} /> Issue Sanction</button>}
        </div>
      </div>

      {isStudent && <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">Below are sanctions/warnings issued to you. Please acknowledge receipt.</div>}

      {/* Search & Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search description, type..." className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20" /></div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"><option value="">All Status</option><option value="active">Active</option><option value="served">Served</option><option value="appealed">Appealed</option><option value="lifted">Lifted</option></select>
        <select value={violationFilter} onChange={(e) => setViolationFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg"><option value="">All Violations</option><option value="tardiness">Tardiness</option><option value="absence">Absence</option><option value="misconduct">Misconduct</option><option value="dress_code">Dress Code</option><option value="equipment_misuse">Equipment Misuse</option><option value="unsportsmanlike">Unsportsmanlike</option><option value="substance">Substance</option><option value="academic">Academic</option><option value="other">Other</option></select>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && isCoachOrAdmin && (
        <div className="flex items-center gap-3 mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <CheckSquare size={16} className="text-blue-600" /><span className="text-sm text-blue-700 font-medium">{selected.size} selected</span>
          <button onClick={() => bulkServedMutation.mutate()} disabled={bulkServedMutation.isPending} className="ml-auto px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">{bulkServedMutation.isPending ? "Processing..." : "Bulk Mark Served"}</button>
          <button onClick={() => setSelected(new Set())} className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">Clear</button>
        </div>
      )}

      {isLoading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-400" size={24} /></div> : (
        <div className="space-y-3" data-export-table>
          {items.map((s) => (
            <div key={s.id} className={`bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition ${selected.has(s.id) ? "ring-2 ring-blue-300" : ""}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {isCoachOrAdmin && <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)} className="rounded mt-1" />}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-[#111827] capitalize">{s.violation_type.replace("_", " ")}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_COLORS[s.severity]}`}>{s.severity}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status]}`}>{s.status}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{s.description}</p>
                    <div className="flex gap-4 text-xs text-gray-400 flex-wrap">
                      <span>📅 Violation: {s.violation_date}</span>
                      <span>⏱ {s.start_date} → {s.end_date || "ongoing"}</span>
                      {s.penalty && <span>⚖️ {s.penalty}</span>}
                    </div>
                    {s.acknowledged_by_student && <div className="mt-2 text-xs text-green-600 flex items-center gap-1"><CheckCircle size={12} /> Acknowledged {s.acknowledged_at ? format(new Date(s.acknowledged_at), "MMM d, yyyy") : ""}</div>}
                  </div>
                </div>
                <div className="flex flex-col gap-2 ml-4 shrink-0">
                  {isStudent && !s.acknowledged_by_student && <button onClick={() => acknowledgeMutation.mutate(s.id)} disabled={acknowledgeMutation.isPending} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Acknowledge</button>}
                  {isCoachOrAdmin && s.status === "active" && <>
                    <button onClick={() => updateMutation.mutate({ id: s.id, data: { status: "served", is_compliant: true } })} className="text-xs px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100">Mark Served</button>
                    <button onClick={() => updateMutation.mutate({ id: s.id, data: { status: "lifted" } })} className="text-xs px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100">Lift</button>
                  </>}
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="text-center py-12 text-gray-400">{isStudent ? "No sanctions. Keep it up! 🎉" : "No sanctions found."}</div>}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4"><h2 className="font-bold text-lg">Issue Sanction</h2><button onClick={() => setShowAdd(false)}><X size={18} /></button></div>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, end_date: form.end_date || null, penalty: form.penalty || null }); }} className="space-y-3">
              <select required value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg"><option value="">-- Select Student --</option>{studentsData?.items.map((s) => (<option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>))}</select>
              <select value={form.violation_type} onChange={(e) => setForm({ ...form, violation_type: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg"><option value="tardiness">Tardiness</option><option value="absence">Absence</option><option value="misconduct">Misconduct</option><option value="dress_code">Dress Code</option><option value="equipment_misuse">Equipment Misuse</option><option value="unsportsmanlike">Unsportsmanlike</option><option value="substance">Substance</option><option value="academic">Academic</option><option value="other">Other</option></select>
              <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg"><option value="warning">Warning</option><option value="minor">Minor</option><option value="major">Major</option><option value="severe">Severe</option></select>
              <textarea placeholder="Description *" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg" rows={3} />
              <div className="grid grid-cols-2 gap-2"><div><label className="text-xs text-gray-500">Violation Date *</label><input type="date" required value={form.violation_date} onChange={(e) => setForm({ ...form, violation_date: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg" /></div><div><label className="text-xs text-gray-500">Start Date *</label><input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg" /></div></div>
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg" />
              <input placeholder="Penalty (optional)" value={form.penalty} onChange={(e) => setForm({ ...form, penalty: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg" />
              <button type="submit" disabled={createMutation.isPending} className="w-full py-2 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium disabled:opacity-50">{createMutation.isPending ? "Issuing..." : "Issue Sanction"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
