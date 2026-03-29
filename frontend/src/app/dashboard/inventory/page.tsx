"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { inventoryApi, reportsApi } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { Package, Download, Plus, Search, QrCode, X, Printer, WifiOff, Loader2 } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useInventoryList, useInvalidateInventory } from "@/hooks/useInventoryData";
import type { Equipment, EquipmentCategory, EquipmentCondition } from "@/types";
import QRCode from "qrcode";

// ── QR Code View Modal ───────────────────────────────────────────────────────

function QRViewModal({ equipment, onClose }: { equipment: Equipment; onClose: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(equipment.qr_code, { width: 256, margin: 2 }).then(setQrDataUrl);
  }, [equipment.qr_code]);

  const handlePrint = () => {
    const win = window.open("", "_blank", "width=400,height=500");
    if (!win) return;
    win.document.write(`
      <html><head><title>QR - ${equipment.name}</title>
      <style>body{font-family:sans-serif;text-align:center;padding:40px}
      img{width:200px;height:200px}h2{margin:0 0 4px}p{color:#666;font-size:14px;margin:4px 0}
      .qr-code{font-family:monospace;font-size:12px;color:#999}</style></head>
      <body><h2>${equipment.name}</h2>
      <p>${equipment.category.replace("_", " ")}</p>
      ${qrDataUrl ? `<img src="${qrDataUrl}" />` : ""}
      <p class="qr-code">${equipment.qr_code}</p>
      <script>window.onload=()=>{window.print();window.close()}</script></body></html>
    `);
    win.document.close();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Equipment QR Code</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm font-medium text-gray-700">{equipment.name}</p>
        <p className="text-xs text-gray-400 capitalize">{equipment.category.replace("_", " ")}</p>
        <div className="flex items-center justify-center py-2">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={`QR for ${equipment.name}`} className="w-48 h-48" />
          ) : (
            <div className="w-48 h-48 bg-gray-100 rounded animate-pulse" />
          )}
        </div>
        <p className="font-mono text-xs text-gray-400">{equipment.qr_code}</p>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 mx-auto px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#16304f] transition"
        >
          <Printer size={14} /> Print Label
        </button>
      </div>
    </div>
  );
}

// ── Add Equipment Modal ──────────────────────────────────────────────────────

const CATEGORIES: { value: EquipmentCategory; label: string }[] = [
  { value: "balls", label: "Balls" },
  { value: "rackets", label: "Rackets" },
  { value: "nets", label: "Nets" },
  { value: "protective_gear", label: "Protective Gear" },
  { value: "uniforms", label: "Uniforms" },
  { value: "training_aids", label: "Training Aids" },
  { value: "electronic", label: "Electronic" },
  { value: "cultural", label: "Cultural" },
  { value: "storage_unit", label: "Storage Unit" },
  { value: "other", label: "Other" },
];

const CONDITIONS: { value: EquipmentCondition; label: string }[] = [
  { value: "new", label: "New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
  { value: "for_repair", label: "For Repair" },
  { value: "condemned", label: "Condemned" },
];

interface AddEquipmentForm {
  name: string;
  description: string;
  category: EquipmentCategory;
  condition: EquipmentCondition;
  total_quantity: number;
  storage_location: string;
  sport_or_art: string;
}

function AddEquipmentModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState<AddEquipmentForm>({
    name: "",
    description: "",
    category: "other",
    condition: "new",
    total_quantity: 1,
    storage_location: "",
    sport_or_art: "",
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (data: AddEquipmentForm) =>
      inventoryApi.createEquipment({
        ...data,
        description: data.description || null,
        storage_location: data.storage_location || null,
        sport_or_art: data.sport_or_art || null,
      }),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to create equipment. Please try again.";
      setError(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) { setError("Equipment name is required."); return; }
    if (form.total_quantity < 1) { setError("Quantity must be at least 1."); return; }
    mutation.mutate(form);
  };

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]";
  const labelCls = "block text-xs font-medium text-gray-700 mb-1";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Add Equipment</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className={labelCls}>Equipment Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Basketball"
              className={inputCls}
              required
            />
          </div>

          {/* Category + Condition */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Category <span className="text-red-500">*</span></label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as EquipmentCategory }))}
                className={inputCls}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Condition <span className="text-red-500">*</span></label>
              <select
                value={form.condition}
                onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value as EquipmentCondition }))}
                className={inputCls}
              >
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className={labelCls}>Total Quantity <span className="text-red-500">*</span></label>
            <input
              type="number"
              min={1}
              value={form.total_quantity}
              onChange={(e) => setForm((f) => ({ ...f, total_quantity: parseInt(e.target.value) || 1 }))}
              className={inputCls}
              required
            />
          </div>

          {/* Storage Location */}
          <div>
            <label className={labelCls}>Storage Location</label>
            <input
              type="text"
              value={form.storage_location}
              onChange={(e) => setForm((f) => ({ ...f, storage_location: e.target.value }))}
              placeholder="e.g. Equipment Room A"
              className={inputCls}
            />
          </div>

          {/* Sport / Art */}
          <div>
            <label className={labelCls}>Sport / Art</label>
            <input
              type="text"
              value={form.sport_or_art}
              onChange={(e) => setForm((f) => ({ ...f, sport_or_art: e.target.value }))}
              placeholder="e.g. Basketball, Dance"
              className={inputCls}
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional notes about this equipment"
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#16304f] disabled:opacity-60"
            >
              {mutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : "Add Equipment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Inventory Page ──────────────────────────────────────────────────────

export default function InventoryPage() {
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === "admin" || role === "director" || role === "staff";
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [qrViewEquipment, setQrViewEquipment] = useState<Equipment | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const { isServerReachable } = useNetworkStatus();
  const invalidateInventory = useInvalidateInventory();

  const { data, isLoading } = useInventoryList(page, search);

  const downloadReport = async (format: "pdf" | "xlsx") => {
    const res =
      format === "pdf"
        ? await reportsApi.inventoryPdf()
        : await reportsApi.inventoryXlsx();
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory_report.${format}`;
    a.click();
  };

  const conditionBadge: Record<string, string> = {
    new: "bg-green-100 text-green-800",
    good: "bg-blue-100 text-blue-800",
    fair: "bg-yellow-100 text-yellow-800",
    poor: "bg-orange-100 text-orange-800",
    for_repair: "bg-red-100 text-red-800",
    condemned: "bg-gray-100 text-gray-500",
  };

  return (
    <>
      {qrViewEquipment && (
        <QRViewModal equipment={qrViewEquipment} onClose={() => setQrViewEquipment(null)} />
      )}
      {showAddModal && (
        <AddEquipmentModal
          onClose={() => setShowAddModal(false)}
          onSuccess={invalidateInventory}
        />
      )}

      <div className="space-y-6">
        {/* Offline notice */}
        {!isServerReachable && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            <WifiOff size={14} />
            <span>Offline — showing cached equipment data. QR codes generated locally.</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Equipment Inventory</h1>
            <p className="text-sm text-gray-500">Manage OSCA sports and cultural equipment</p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              {isServerReachable && (
                <>
                  <button
                    onClick={() => downloadReport("pdf")}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50"
                  >
                    <Download size={16} /> PDF
                  </button>
                  <button
                    onClick={() => downloadReport("xlsx")}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50"
                  >
                    <Download size={16} /> Excel
                  </button>
                </>
              )}
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#16304f]"
              >
                <Plus size={16} /> Add Equipment
              </button>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search equipment name or QR code..."
            className="w-full border rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#1E3A5F] text-white">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Equipment</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-left font-medium">Condition</th>
                <th className="px-4 py-3 text-left font-medium">QR Code</th>
                <th className="px-4 py-3 text-center font-medium">Total</th>
                <th className="px-4 py-3 text-center font-medium">Available</th>
                <th className="px-4 py-3 text-left font-medium">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : (data?.items ?? []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No equipment found
                  </td>
                </tr>
              ) : (
                (data?.items ?? []).map((eq) => (
                  <tr key={eq.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <Package size={16} className="text-gray-400" />
                        {eq.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-600">
                      {eq.category.replace("_", " ")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          conditionBadge[eq.condition] ?? ""
                        }`}
                      >
                        {eq.condition.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setQrViewEquipment(eq)}
                        className="flex items-center gap-1.5 font-mono text-xs text-[#1E3A5F] hover:underline"
                      >
                        <QrCode size={14} />
                        {eq.qr_code}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">{eq.total_quantity}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={
                          eq.available_quantity === 0
                            ? "text-red-600 font-semibold"
                            : "text-green-600 font-semibold"
                        }
                      >
                        {eq.available_quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {eq.storage_location ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {data && data.pages > 1 && (
            <div className="px-4 py-3 border-t flex items-center justify-between text-sm text-gray-600">
              <span>
                Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} of{" "}
                {data.total}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
                >
                  Prev
                </button>
                <button
                  disabled={page === data.pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
