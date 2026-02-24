"use client";

/**
 * Equipment Requests page — Coach/PE Instructor submits requests;
 * Admin/Director approves or rejects them.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryApi } from "@/lib/api";
import {
  CheckCircle2, XCircle, Clock, Plus, X, Loader2, Package,
} from "lucide-react";
import type {
  EquipmentRequest, PaginatedResponse, RequestStatus, Equipment,
} from "@/types";
import { useAuthStore } from "@/store/useAuthStore";
import { format } from "date-fns";

// ── Status badge helper ────────────────────────────────────────────────────────

const statusConfig: Record<RequestStatus, { label: string; className: string; icon: React.ElementType }> = {
  pending:  { label: "Pending",  className: "bg-yellow-100 text-yellow-800", icon: Clock },
  approved: { label: "Approved", className: "bg-green-100 text-green-800",  icon: CheckCircle2 },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800",      icon: XCircle },
};

// ── New Request Modal ──────────────────────────────────────────────────────────

interface RequestItem { equipment_id: string; quantity: number; equipment_name: string }

interface NewRequestModalProps { onClose: () => void }

function NewRequestModal({ onClose }: NewRequestModalProps) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<RequestItem[]>([]);
  const [expectedReturn, setExpectedReturn] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: equipmentData } = useQuery<PaginatedResponse<Equipment>>({
    queryKey: ["equipment-for-request"],
    queryFn: async () => {
      const res = await inventoryApi.listEquipment({ available_only: true, page_size: 100 });
      return res.data;
    },
  });
  const availableEquipment = equipmentData?.items ?? [];

  const addItem = (eq: Equipment) => {
    if (items.find((i) => i.equipment_id === eq.id)) return;
    setItems((prev) => [...prev, { equipment_id: eq.id, quantity: 1, equipment_name: eq.name }]);
  };

  const updateQty = (equipment_id: string, qty: number) => {
    setItems((prev) => prev.map((i) => i.equipment_id === equipment_id ? { ...i, quantity: qty } : i));
  };

  const removeItem = (equipment_id: string) => {
    setItems((prev) => prev.filter((i) => i.equipment_id !== equipment_id));
  };

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      inventoryApi.createRequest({
        items: items.map(({ equipment_id, quantity }) => ({ equipment_id, quantity })),
        expected_return: new Date(expectedReturn).toISOString(),
        notes: notes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-requests"] });
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to submit request.";
      setError(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (items.length === 0) { setError("Add at least one equipment item."); return; }
    if (!expectedReturn) { setError("Expected return date is required."); return; }
    if (new Date(expectedReturn) <= new Date()) { setError("Expected return must be in the future."); return; }
    mutate();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-gray-900">New Equipment Request</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Equipment selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Add Equipment <span className="text-red-500">*</span>
            </label>
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y">
              {availableEquipment.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No available equipment</p>
              ) : availableEquipment.map((eq) => {
                const added = items.find((i) => i.equipment_id === eq.id);
                return (
                  <div key={eq.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{eq.name}</p>
                      <p className="text-xs text-gray-400">{eq.category} · Available: {eq.available_quantity}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => added ? removeItem(eq.id) : addItem(eq)}
                      className={`text-xs px-3 py-1 rounded-lg font-medium transition ${
                        added
                          ? "bg-red-50 text-red-600 hover:bg-red-100"
                          : "bg-[#1E3A5F]/10 text-[#1E3A5F] hover:bg-[#1E3A5F]/20"
                      }`}
                    >
                      {added ? "Remove" : "Add"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected items with qty */}
          {items.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Selected Items</p>
              {items.map((item) => (
                <div key={item.equipment_id} className="flex items-center gap-3 px-3 py-2 bg-blue-50 rounded-lg">
                  <Package size={14} className="text-[#1E3A5F] shrink-0" />
                  <span className="flex-1 text-sm font-medium text-gray-800">{item.equipment_name}</span>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Qty</label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateQty(item.equipment_id, parseInt(e.target.value) || 1)}
                      className="w-14 px-2 py-1 text-sm border border-gray-200 rounded text-center"
                    />
                  </div>
                  <button type="button" onClick={() => removeItem(item.equipment_id)} className="text-red-400 hover:text-red-600">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Expected return */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expected Return <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={expectedReturn}
              onChange={(e) => setExpectedReturn(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional purpose or notes…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F] resize-none"
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
              {isPending ? <><Loader2 size={14} className="animate-spin" /> Submitting…</> : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Rejection Modal ────────────────────────────────────────────────────────────

function RejectModal({ requestId, onClose }: { requestId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: () => inventoryApi.rejectRequest(requestId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-requests"] });
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to reject request.";
      setError(msg);
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Reject Request</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rejection Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Explain why this request is rejected…"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 resize-none"
          />
        </div>
        {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">
            Cancel
          </button>
          <button
            onClick={() => {
              if (!reason.trim()) { setError("Rejection reason is required."); return; }
              mutate();
            }}
            disabled={isPending}
            className="flex items-center gap-2 px-5 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 font-medium"
          >
            {isPending ? <><Loader2 size={14} className="animate-spin" /> Rejecting…</> : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function EquipmentRequestsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "">("");
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const isRequester = user?.role === "coach" || user?.role === "pe_instructor";
  const isApprover = user?.role === "admin" || user?.role === "director";

  const { data, isLoading } = useQuery<PaginatedResponse<EquipmentRequest>>({
    queryKey: ["equipment-requests", page, statusFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, page_size: 20 };
      if (statusFilter) params.status = statusFilter;
      const res = await inventoryApi.listRequests(params);
      return res.data;
    },
  });

  const { mutate: approveRequest } = useMutation({
    mutationFn: (id: string) => inventoryApi.approveRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["equipment-requests"] }),
  });

  const totalPages = data?.pages ?? 1;

  return (
    <>
      {showNewRequest && <NewRequestModal onClose={() => setShowNewRequest(false)} />}
      {rejectingId && <RejectModal requestId={rejectingId} onClose={() => setRejectingId(null)} />}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Equipment Requests</h1>
            <p className="text-sm text-gray-500">
              {isRequester ? "Submit and track your equipment requests" : "Review and approve equipment requests"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as RequestStatus | ""); setPage(1); }}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            {isRequester && (
              <button
                onClick={() => setShowNewRequest(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#16304f] transition"
              >
                <Plus size={16} /> New Request
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#1E3A5F] text-white">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Requester</th>
                <th className="px-4 py-3 text-left font-medium">Items</th>
                <th className="px-4 py-3 text-left font-medium">Expected Return</th>
                <th className="px-4 py-3 text-left font-medium">Requested At</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
                {isApprover && <th className="px-4 py-3 text-center font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={isApprover ? 6 : 5} className="px-4 py-8 text-center text-gray-400">
                    <Loader2 size={20} className="animate-spin inline-block mr-2" />Loading…
                  </td>
                </tr>
              ) : (data?.items ?? []).length === 0 ? (
                <tr>
                  <td colSpan={isApprover ? 6 : 5} className="px-4 py-10 text-center text-gray-400 text-sm">
                    No requests found.
                  </td>
                </tr>
              ) : (data?.items ?? []).map((req) => {
                const { label, className, icon: StatusIcon } = statusConfig[req.status];
                return (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{req.requester_name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <ul className="space-y-0.5">
                        {req.items.map((item) => (
                          <li key={item.id} className="text-xs">
                            {item.equipment_name} × {item.quantity}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {format(new Date(req.expected_return), "MMM d, yyyy · h:mm a")}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {format(new Date(req.requested_at), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
                        <StatusIcon size={11} />
                        {label}
                      </span>
                      {req.status === "rejected" && req.rejection_reason && (
                        <p className="text-xs text-gray-400 mt-1 max-w-[140px] mx-auto truncate" title={req.rejection_reason}>
                          {req.rejection_reason}
                        </p>
                      )}
                    </td>
                    {isApprover && (
                      <td className="px-4 py-3 text-center">
                        {req.status === "pending" && (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => approveRequest(req.id)}
                              className="flex items-center gap-1 px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                            >
                              <CheckCircle2 size={12} /> Approve
                            </button>
                            <button
                              onClick={() => setRejectingId(req.id)}
                              className="flex items-center gap-1 px-3 py-1 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium border border-red-200"
                            >
                              <XCircle size={12} /> Reject
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </>
  );
}
