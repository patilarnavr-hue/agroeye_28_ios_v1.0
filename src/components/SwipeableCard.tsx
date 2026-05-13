import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Trash2, Edit, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { hapticFeedback } from "@/utils/haptics";

interface SwipeAction {
  icon: React.ReactNode;
  color: string;
  action: () => void;
}

interface SwipeableCardProps {
  children: React.ReactNode;
  onDelete?: () => void;
  onEdit?: () => void;
  onComplete?: () => void;
  className?: string;
  disabled?: boolean;
}

export function SwipeableCard({
  children,
  onDelete,
  onEdit,
  onComplete,
  className,
  disabled = false,
}: SwipeableCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const x = useMotionValue(0);
  const constraintRef = useRef<HTMLDivElement>(null);

  const leftActions: SwipeAction[] = [];
  const rightActions: SwipeAction[] = [];

  if (onComplete) {
    leftActions.push({
      icon: <Check className="w-5 h-5" />,
      color: "bg-green-500",
      action: onComplete,
    });
  }

  if (onEdit) {
    rightActions.push({
      icon: <Edit className="w-5 h-5" />,
      color: "bg-blue-500",
      action: onEdit,
    });
  }

  if (onDelete) {
    rightActions.push({
      icon: <Trash2 className="w-5 h-5" />,
      color: "bg-destructive",
      action: onDelete,
    });
  }

  const leftActionWidth = leftActions.length * 64;
  const rightActionWidth = rightActions.length * 64;

  const leftOpacity = useTransform(x, [0, leftActionWidth], [0, 1]);
  const rightOpacity = useTransform(x, [-rightActionWidth, 0], [1, 0]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = 50;
    const velocity = info.velocity.x;
    const offset = info.offset.x;

    if (offset > threshold || velocity > 500) {
      if (leftActions.length > 0) {
        setIsOpen(true);
        hapticFeedback("medium");
      }
    } else if (offset < -threshold || velocity < -500) {
      if (rightActions.length > 0) {
        setIsOpen(true);
        hapticFeedback("medium");
      }
    } else {
      setIsOpen(false);
    }
  };

  const handleActionClick = (action: SwipeAction) => {
    hapticFeedback("heavy");
    action.action();
    setIsOpen(false);
  };

  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div ref={constraintRef} className="relative overflow-hidden rounded-2xl">
      {/* Left Actions */}
      {leftActions.length > 0 && (
        <motion.div
          style={{ opacity: leftOpacity }}
          className="absolute left-0 top-0 bottom-0 flex items-center"
        >
          {leftActions.map((action, i) => (
            <button
              key={i}
              onClick={() => handleActionClick(action)}
              className={cn(
                "w-16 h-full flex items-center justify-center text-white",
                action.color
              )}
            >
              {action.icon}
            </button>
          ))}
        </motion.div>
      )}

      {/* Right Actions */}
      {rightActions.length > 0 && (
        <motion.div
          style={{ opacity: rightOpacity }}
          className="absolute right-0 top-0 bottom-0 flex items-center"
        >
          {rightActions.map((action, i) => (
            <button
              key={i}
              onClick={() => handleActionClick(action)}
              className={cn(
                "w-16 h-full flex items-center justify-center text-white",
                action.color
              )}
            >
              {action.icon}
            </button>
          ))}
        </motion.div>
      )}

      {/* Main Card */}
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{
          left: -rightActionWidth,
          right: leftActionWidth,
        }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={{ x: isOpen ? (x.get() > 0 ? leftActionWidth : -rightActionWidth) : 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className={cn("relative bg-background z-10", className)}
        onClick={() => isOpen && setIsOpen(false)}
      >
        {children}
      </motion.div>
    </div>
  );
}
