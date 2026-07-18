"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { eligibilityApi, usersApi } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { ShieldCheck, Plus, X, Loader2, Search, Download, FileText, CheckSquare } from "lucide-react";
import type { AthleteEligibility, PaginatedResponse, UserSummary } from "@/types";
import { exportToCSV, exportToPrintPDF } from "@/lib/exportUtils";

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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery<PaginatedResponse<AthleteEligibility>>({
    queryKey: ["eligibility"],
    queryFn: async () => (await eligibilityApi.list({ page_size: 100, current_only: true })).data,
  });

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => eligibilityApi.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["eligibility"] }); setShowAdd(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => eligibilityApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["eligibility"] }),
  });

  const bulkClearMutation = useMutation({
    mutationFn: async () => {
      for (const id of selected) {
        await eligibilityApi.update(id, { medical_clearance: true, status: "eligible", is_current: false });
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["eligibility"] }); setSelected(new Set()); },
  });

  const { data: studentsData } = useQuery<PaginatedResponse<UserSummary>>({
    queryKey: ["students-list"],
    queryFn: async () => (await usersApi.list({ role: "student", page_size: 100, is_active: true })).data,
    enabled: isStaff,
  });

  const [form, setForm] = useState({ student_id: "", status: "restricted", reason_type: "injury", reason_detail: "", start_date: "", end_date: "", notes: "" });

  // Filter items
  const items = (data?.items ?? []).filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.student_id.toLowerCase().includes(q) || (r.reason_detail?.toLowerCase().includes(q) ?? false) || (r.reason_type?.toLowerCase().includes(q) ?? false);
    }
    return true;
  });

  const toggleSelect = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };
  const toggleAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((r) => r.id)));
  };

  const handleExportCSV = () => {
    exportToCSV(items.map((r) => ({ student_id: r.student_id, status: r.status, reason_type: r.reason_type ?? "", reason_detail: r.reason_detail ?? "", start_date: r.start_date, end_date: r.end_date ?? "", clearance: r.medical_clearance ? "Yes" : "No" })), "eligibility_records");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ShieldCheck size={22} className="text-[#1E3A5F]" />
          <h1 className="text-xl font-bold text-[#111827]">Athlete Eligibility</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-3 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50"><Download size={13} /> CSV</button>
          <button onClick={() => exportToPrintPDF("Eligibility Records")} className="flex items-center gap-1.5 px-3 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50"><FileText size={13} /> PDF</button>
          {isStaff && <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#16304f]"><Plus size={14} /> Add Record</button>}
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by student, reason..." className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg">
          <option value="">All Status</option>
          <option value="eligible">Eligible</option>
          <option value="restricted">Restricted</option>
          <option value="ineligible">Ineligible</option>
          <option value="pending_clearance">Pending Clearance</option>
        </select>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && isStaff && (
        <div className="flex items-center gap-3 mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <CheckSquare size={16} className="text-blue-600" />
          <span className="text-sm text-blue-700 font-medium">{selected.size} selected</span>
          <button onClick={() => bulkClearMutation.mutate()} disabled={bulkClearMutation.isPending} className="ml-auto px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
            {bulkClearMutation.isPending ? "Processing..." : "Bulk Grant Clearance"}
          </button>
          <button onClick={() => setSelected(new Set())} className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">Clear</button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-400" size={24} /></div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm" data-export-table>
            <thead className="bg-gray-50 border-b">
              <tr>
                {isStaff && <th className="px-3 py-3 w-10"><input type="checkbox" checked={selected.size === items.length && items.length > 0} onChange={toggleAll} className="rounded" /></th>}
                <th className="text-left px-4 py-3 font-medium text-gray-600">Student ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Reason</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Period</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Clearance</th>
                {isStaff && <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className={`border-b last:border-0 hover:bg-gray-50 ${selected.has(r.id) ? "bg-blue-50" : ""}`}>
                  {isStaff && <td className="px-3 py-3"><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} className="rounded" /></td>}
                  <td className="px-4 py-3 font-mono text-xs">{r.student_id.slice(0, 8)}...</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status]}`}>{r.status.replace("_", " ")}</span></td>
                  <td className="px-4 py-3 text-gray-600">{r.reason_type && <span className="capitalize">{r.reason_type}</span>}{r.reason_detail && <span className="text-xs text-gray-400 ml-1">— {r.reason_detail}</span>}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.start_date} {r.end_date ? `→ ${r.end_date}` : "(ongoing)"}</td>
                  <td className="px-4 py-3">{r.medical_clearance ? <span className="text-xs text-green-600 font-medium">✓ Cleared</span> : <span className="text-xs text-gray-400">Pending</span>}</td>
                  {isStaff && <td className="px-4 py-3">{!r.medical_clearance && <button onClick={() => updateMutation.mutate({ id: r.id, data: { medical_clearance: true, status: "eligible", is_current: false } })} className="text-xs text-blue-600 hover:underline">Grant Clearance</button>}</td>}
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">No records found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4"><h2 className="font-bold text-lg">Add Eligibility Record</h2><button onClick={() => setShowAdd(false)}><X size={18} /></button></div>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-3">
              <select required value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg"><option value="">-- Select Student --</option>{studentsData?.items.map((s) => (<option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>))}</select>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg"><option value="eligible">Eligible</option><option value="restricted">Restricted</option><option value="ineligible">Ineligible</option><option value="pending_clearance">Pending Clearance</option></select>
              <select value={form.reason_type} onChange={(e) => setForm({ ...form, reason_type: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg"><option value="injury">Injury</option><option value="medical">Medical</option><option value="disciplinary">Disciplinary</option><option value="academic">Academic</option><option value="other">Other</option></select>
              <input placeholder="Detail" value={form.reason_detail} onChange={(e) => setForm({ ...form, reason_detail: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg" />
              <input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg" />
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg" />
              <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg" rows={2} />
              <button type="submit" disabled={createMutation.isPending} className="w-full py-2 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium disabled:opacity-50">{createMutation.isPending ? "Saving..." : "Create Record"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
