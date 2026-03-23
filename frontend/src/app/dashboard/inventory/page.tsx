"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { inventoryApi, reportsApi } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { Package, Download, Plus, Search } from "lucide-react";
import type { Equipment, PaginatedResponse } from "@/types";

export default function InventoryPage() {
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === "admin" || role === "director" || role === "staff";
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<PaginatedResponse<Equipment>>({
    queryKey: ["equipment", page, search],
    queryFn: async () => {
      const res = await inventoryApi.listEquipment({
        page,
        page_size: 20,
        available_only: true,
        ...(search ? { search } : {}),
      });
      return res.data;
    },
  });

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipment Inventory</h1>
          <p className="text-sm text-gray-500">Manage OSCA sports and cultural equipment</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
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
            <button className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#16304f]">
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
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {eq.qr_code}
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
  );
}
