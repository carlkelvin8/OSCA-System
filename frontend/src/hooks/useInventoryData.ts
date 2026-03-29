"use client";

/**
 * React Query hooks for the Inventory module.
 * Maps to SQL queries Q-34 – Q-39 in OSCA_SQL_Queries.sql.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { inventoryApi } from "@/lib/api";
import { equipmentCache } from "@/lib/offlineStore";
import { useNetworkStatus } from "./useNetworkStatus";
import type { Equipment, PaginatedResponse } from "@/types";

const PAGE_SIZE = 20;

// ── Filter params shared by Q-35 and Q-36 ────────────────────────────────────

export interface EquipmentFilters {
  search?: string;
  category?: string;
  sport?: string;
  available_only?: boolean;
}

// ── Q-35: Count equipment (with optional filters) ─────────────────────────────

/**
 * Returns the total count of active equipment matching the given filters.
 * Reuses the paginated list endpoint's `total` field — no separate endpoint needed.
 */
export function useEquipmentCount(filters: EquipmentFilters = {}) {
  const { isServerReachable } = useNetworkStatus();

  return useQuery<number>({
    queryKey: ["equipment", "count", filters],
    queryFn: async () => {
      if (!isServerReachable) {
        const cached = equipmentCache.load();
        if (!cached) return 0;
        let items = cached.items;
        if (filters.search) items = equipmentCache.search(filters.search);
        if (filters.available_only) items = items.filter((e) => e.available_quantity > 0);
        return items.length;
      }
      const params: Record<string, string | number | boolean> = { page: 1, page_size: 1 };
      if (filters.category) params.category = filters.category;
      if (filters.sport) params.sport_or_art = filters.sport;
      if (filters.available_only) params.available_only = true;
      if (filters.search) params.search = filters.search;
      const res = await inventoryApi.listEquipment(params);
      return res.data.total;
    },
    staleTime: 30_000,
  });
}

// ── Q-36: Paginated equipment list ───────────────────────────────────────────

/**
 * Returns a paginated list of active equipment with optional filters.
 * Matches: SELECT id, name, description, category, condition, barcode,
 *          total_quantity, available_quantity, storage_location, sport_or_art,
 *          acquisition_date, acquisition_cost, is_active, notes, created_at
 *          FROM equipment WHERE is_active = TRUE ...
 */
export function useInventoryList(
  page: number,
  search: string,
  filters: Omit<EquipmentFilters, "search"> = {}
) {
  const { isServerReachable } = useNetworkStatus();

  return useQuery<PaginatedResponse<Equipment>>({
    queryKey: ["equipment", page, search, filters],
    queryFn: async () => {
      // ── Offline: serve from localStorage cache ──────────────────────────
      if (!isServerReachable) {
        const cached = equipmentCache.load();
        if (!cached) return { items: [], total: 0, page: 1, page_size: PAGE_SIZE, pages: 0 };
        let items = cached.items;
        if (search) items = equipmentCache.search(search);
        if (filters.available_only) items = items.filter((e) => e.available_quantity > 0);
        if (filters.category) items = items.filter((e) => e.category === filters.category);
        const start = (page - 1) * PAGE_SIZE;
        return {
          items: items.slice(start, start + PAGE_SIZE),
          total: items.length,
          page,
          page_size: PAGE_SIZE,
          pages: Math.ceil(items.length / PAGE_SIZE),
        };
      }

      // ── Online: fetch from API ──────────────────────────────────────────
      const params: Record<string, string | number | boolean> = {
        page,
        page_size: PAGE_SIZE,
      };
      if (search) params.search = search;
      if (filters.category) params.category = filters.category;
      if (filters.sport) params.sport_or_art = filters.sport;
      if (filters.available_only) params.available_only = true;

      const res = await inventoryApi.listEquipment(params);

      // Refresh offline cache in the background (backend max page_size = 100)
      if (page === 1 && !search) {
        inventoryApi
          .listEquipment({ page_size: 100 })
          .then((r) => equipmentCache.save(r.data.items))
          .catch(() => {/* keep existing cache on failure */});
      }

      return res.data;
    },
    staleTime: 30_000,
  });
}

// ── Q-37: Get equipment by ID ────────────────────────────────────────────────

/**
 * Fetches a single equipment record by UUID.
 * Matches: SELECT ... FROM equipment WHERE id = :equipment_id
 */
export function useEquipmentById(id: string | null) {
  return useQuery<Equipment>({
    queryKey: ["equipment", id],
    queryFn: async () => {
      const res = await inventoryApi.getEquipment(id!);
      return res.data;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}

// ── Q-38: Get equipment by barcode / QR code ─────────────────────────────────

/**
 * Looks up equipment by its barcode (QR code value).
 * Matches: SELECT ... FROM equipment WHERE barcode = :barcode
 * Falls back to local cache when offline.
 */
export function useEquipmentByBarcode(barcode: string | null) {
  const { isServerReachable } = useNetworkStatus();

  return useQuery<Equipment | null>({
    queryKey: ["equipment", "barcode", barcode],
    queryFn: async () => {
      if (!barcode) return null;
      if (!isServerReachable) {
        return equipmentCache.findByQR(barcode) ?? null;
      }
      const res = await inventoryApi.getEquipmentByQR(barcode);
      return res.data;
    },
    enabled: !!barcode,
    staleTime: 60_000,
    retry: false,
  });
}

// ── Invalidation helper ───────────────────────────────────────────────────────

/** Call after Q-34 (create) or Q-39 (update) to refetch the list. */
export function useInvalidateInventory() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["equipment"] });
}
