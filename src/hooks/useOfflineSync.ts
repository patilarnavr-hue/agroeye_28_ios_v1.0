import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getSyncQueue,
  removeFromSyncQueue,
  updateSyncItemRetries,
  getSyncQueueCount,
  initOfflineDB,
} from "@/utils/offlineStorage";
import { useDynamicIsland } from "@/components/DynamicIsland";
import { hapticFeedback } from "@/utils/haptics";

const MAX_RETRIES = 3;

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const dynamicIsland = useDynamicIsland();

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    try {
      const count = await getSyncQueueCount();
      setPendingCount(count);
    } catch {
      console.error("Failed to get sync queue count");
    }
  }, []);

  // Sync a single item
  const syncItem = useCallback(async (item: Awaited<ReturnType<typeof getSyncQueue>>[0]) => {
    const { table, operation, data, id, retries } = item;

    try {
      // Type-safe table access
      const tableRef = supabase.from(table as "moisture_readings" | "fertility_readings" | "sensors" | "crops" | "watering_schedules" | "alerts");

      switch (operation) {
        case "insert":
          await tableRef.insert(data as never);
          break;
        case "update":
          if (data.id) {
            await tableRef.update(data as never).eq("id", data.id as string);
          }
          break;
        case "delete":
          if (data.id) {
            await tableRef.delete().eq("id", data.id as string);
          }
          break;
      }

      await removeFromSyncQueue(id);
      return true;
    } catch (error) {
      console.error(`Failed to sync item ${id}:`, error);
      
      if (retries < MAX_RETRIES) {
        await updateSyncItemRetries(id, retries + 1);
      } else {
        // Remove after max retries
        await removeFromSyncQueue(id);
      }
      return false;
    }
  }, []);

  // Process sync queue
  const processQueue = useCallback(async () => {
    if (isSyncing || !isOnline) return;

    setIsSyncing(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const queue = await getSyncQueue();
      
      if (queue.length === 0) {
        setIsSyncing(false);
        return;
      }

      for (const item of queue) {
        const success = await syncItem(item);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      await updatePendingCount();

      if (successCount > 0) {
        hapticFeedback("success");
        dynamicIsland.show({
          type: "success",
          title: "Synced offline changes",
          message: `${successCount} item${successCount > 1 ? "s" : ""} synced`,
          duration: 3000,
        });
      }

      if (failCount > 0) {
        dynamicIsland.show({
          type: "warning",
          title: "Some items failed to sync",
          message: `${failCount} item${failCount > 1 ? "s" : ""} will retry later`,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Error processing sync queue:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isOnline, syncItem, updatePendingCount, dynamicIsland]);

  // Listen for online/offline events
  useEffect(() => {
    initOfflineDB();
    updatePendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      hapticFeedback("success");
      dynamicIsland.show({
        type: "success",
        title: "Back online",
        message: "Syncing pending changes...",
        duration: 2000,
      });
      // Delay sync slightly to ensure connection is stable
      setTimeout(processQueue, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      hapticFeedback("warning");
      dynamicIsland.show({
        type: "warning",
        title: "You're offline",
        message: "Changes will sync when you're back online",
        duration: 3000,
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial sync if online
    if (navigator.onLine) {
      processQueue();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [processQueue, updatePendingCount, dynamicIsland]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    processQueue,
    updatePendingCount,
  };
}
