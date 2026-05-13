import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, AlertTriangle, Info, Droplet } from "lucide-react";
import { cn } from "@/lib/utils";

type NotificationType = "success" | "error" | "warning" | "info" | "moisture";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
}

interface DynamicIslandContextValue {
  show: (notification: Omit<Notification, "id">) => void;
  hide: () => void;
}

const DynamicIslandContext = createContext<DynamicIslandContextValue | null>(null);

export function useDynamicIsland() {
  const context = useContext(DynamicIslandContext);
  if (!context) {
    throw new Error("useDynamicIsland must be used within DynamicIslandProvider");
  }
  return context;
}

const icons: Record<NotificationType, React.ReactNode> = {
  success: <Check className="w-4 h-4" />,
  error: <X className="w-4 h-4" />,
  warning: <AlertTriangle className="w-4 h-4" />,
  info: <Info className="w-4 h-4" />,
  moisture: <Droplet className="w-4 h-4" />,
};

const colors: Record<NotificationType, string> = {
  success: "bg-green-500",
  error: "bg-destructive",
  warning: "bg-amber-500",
  info: "bg-primary",
  moisture: "bg-blue-500",
};

export function DynamicIslandProvider({ children }: { children: React.ReactNode }) {
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const show = useCallback((notif: Omit<Notification, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setNotification({ ...notif, id });
    setIsExpanded(true);
  }, []);

  const hide = useCallback(() => {
    setIsExpanded(false);
    setTimeout(() => setNotification(null), 300);
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(hide, notification.duration || 3000);
      return () => clearTimeout(timer);
    }
  }, [notification, hide]);

  return (
    <DynamicIslandContext.Provider value={{ show, hide }}>
      {children}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ width: 120, height: 32, opacity: 0, y: -20 }}
            animate={{
              width: isExpanded ? 320 : 120,
              height: isExpanded ? 64 : 32,
              opacity: 1,
              y: 0,
            }}
            exit={{ width: 120, height: 32, opacity: 0, y: -20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className={cn(
              "fixed top-12 left-1/2 -translate-x-1/2 z-[100]",
              "bg-black/90 backdrop-blur-xl rounded-[24px]",
              "flex items-center justify-center overflow-hidden",
              "shadow-2xl border border-white/10"
            )}
            onClick={hide}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 px-4"
            >
              <div className={cn("p-1.5 rounded-full text-white", colors[notification.type])}>
                {icons[notification.type]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {notification.title}
                </p>
                {isExpanded && notification.message && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="text-white/70 text-xs truncate"
                  >
                    {notification.message}
                  </motion.p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DynamicIslandContext.Provider>
  );
}
