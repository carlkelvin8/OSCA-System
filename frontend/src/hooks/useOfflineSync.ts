"use client";

import { useState, useEffect, useCallback } from "react";
import { inventoryApi } from "@/lib/api";
import { equipmentCache, offlineQueue, type OfflineTransaction } from "@/lib/offlineStore";
import { useNetworkStatus } from "./useNetworkStatus";

/**
 * Manages the offline transaction queue and syncs to server when online.
 * Also keeps the local equipment cache up to date.
 */
export function useOfflineSync() {
  const { isServerReachable } = useNetworkStatus();
  const [pending, setPending] = useState<OfflineTransaction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastCacheUpdate, setLastCacheUpdate] = useState<string | null>(null);

  // Load pending transactions on mount
  useEffect(() => {
    setPending(offlineQueue.getPending());
    const cached = equipmentCache.load();
    if (cached) setLastCacheUpdate(cached.cachedAt);
  }, []);

  // Refresh the local equipment cache when server is reachable
  const refreshCache = useCallback(async () => {
    if (!isServerReachable) return;
    try {
      const res = await inventoryApi.listEquipment({ page_size: 100 });
      equipmentCache.save(res.data.items);
      setLastCacheUpdate(new Date().toISOString());
    } catch {
      // Silently fail — keep existing cache
    }
  }, [isServerReachable]);

  // Auto-refresh cache when coming online
  useEffect(() => {
    if (isServerReachable) {
      refreshCache();
    }
  }, [isServerReachable, refreshCache]);

  // Sync pending transactions to server
  const sync = useCallback(async () => {
    if (!isServerReachable || isSyncing) return;
    const pendingTxs = offlineQueue.getPending();
    if (pendingTxs.length === 0) return;

    setIsSyncing(true);

    for (const tx of pendingTxs) {
      offlineQueue.update(tx.id, { status: "syncing" });

      try {
        if (tx.type === "borrow") {
          await inventoryApi.borrow(tx.payload);
        } else if (tx.type === "return") {
          await inventoryApi.return(tx.payload);
        } else if (tx.type === "create_equipment") {
          await inventoryApi.createEquipment(tx.payload);
        }
        offlineQueue.update(tx.id, { status: "synced" });
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          "Sync failed";
        offlineQueue.update(tx.id, { status: "failed", error: msg });
      }
    }

    offlineQueue.clearSynced();
    setPending(offlineQueue.getPending());
    setIsSyncing(false);

    // Refresh cache after sync to get updated quantities
    refreshCache();
  }, [isServerReachable, isSyncing, refreshCache]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isServerReachable && offlineQueue.getPending().length > 0) {
      sync();
    }
  }, [isServerReachable, sync]);

  // Queue a new offline transaction
  const queueTransaction = useCallback(
    (type: OfflineTransaction["type"], payload: Record<string, unknown>) => {
      const tx = offlineQueue.add(type, payload);
      setPending(offlineQueue.getPending());
      return tx;
    },
    []
  );

  // Dismiss a failed transaction
  const dismissTransaction = useCallback((id: string) => {
    offlineQueue.remove(id);
    setPending(offlineQueue.getPending());
  }, []);

  return {
    pending,
    pendingCount: pending.length,
    isSyncing,
    isServerReachable,
    lastCacheUpdate,
    sync,
    refreshCache,
    queueTransaction,
    dismissTransaction,
  };
}
