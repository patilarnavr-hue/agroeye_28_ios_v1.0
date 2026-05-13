import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, CloudOff, RefreshCw, Check } from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { cn } from "@/lib/utils";

export function OfflineSyncBanner() {
  const { isOnline, isSyncing, pendingCount, processQueue } = useOfflineSync();

  const showBanner = !isOnline || pendingCount > 0;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="overflow-hidden"
        >
          <div
            className={cn(
              "flex items-center justify-between px-4 py-2.5",
              "text-sm font-medium",
              !isOnline
                ? "bg-accent/50 text-accent-foreground"
                : "bg-primary/10 text-primary"
            )}
          >
            <div className="flex items-center gap-2">
              {!isOnline ? (
                <>
                  <WifiOff className="w-4 h-4" />
                  <span>You're offline</span>
                </>
              ) : pendingCount > 0 ? (
                <>
                  <CloudOff className="w-4 h-4" />
                  <span>
                    {pendingCount} pending change{pendingCount > 1 ? "s" : ""}
                  </span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>All synced</span>
                </>
              )}
            </div>

            {isOnline && pendingCount > 0 && (
              <button
                onClick={() => processQueue()}
                disabled={isSyncing}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full",
                  "bg-primary text-primary-foreground text-xs font-medium",
                  "disabled:opacity-50"
                )}
              >
                <RefreshCw
                  className={cn("w-3 h-3", isSyncing && "animate-spin")}
                />
                {isSyncing ? "Syncing..." : "Sync now"}
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
