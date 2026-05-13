import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
}

export function PullToRefresh({ children, onRefresh, className }: PullToRefreshProps) {
  const { isRefreshing, pullDistance, pullProgress, handlers } = usePullToRefresh({
    onRefresh,
  });

  return (
    <div className={cn("relative", className)} {...handlers}>
      {/* Pull indicator */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 z-50 flex items-center justify-center"
        style={{
          top: Math.max(0, pullDistance - 40),
          opacity: pullProgress,
        }}
      >
        <div
          className={cn(
            "w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm",
            "border border-border shadow-lg flex items-center justify-center"
          )}
        >
          {isRefreshing ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <motion.div
              animate={{ rotate: pullProgress * 180 }}
              className="w-5 h-5 text-primary"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12l7-7 7 7" />
              </svg>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Content with pull effect */}
      <motion.div
        style={{
          transform: `translateY(${pullDistance * 0.3}px)`,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
