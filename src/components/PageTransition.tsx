import { motion, Variants } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={pageVariants}
      className={className}
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}

// Slide up variant for modals/sheets
export const slideUpVariants: Variants = {
  initial: { y: "100%", opacity: 0 },
  enter: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", damping: 28, stiffness: 320 },
  },
  exit: {
    y: "100%",
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

// Scale variant for cards
export const scaleVariants: Variants = {
  initial: { scale: 0.96, opacity: 0 },
  enter: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring", damping: 22, stiffness: 280 },
  },
  exit: {
    scale: 0.96,
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

// Stagger children animation
export const staggerContainer: Variants = {
  initial: {},
  enter: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.08,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 12 },
  enter: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
  },
};

// Fade in variant for lightweight elements
export const fadeInVariants: Variants = {
  initial: { opacity: 0 },
  enter: {
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

// Card tap animation helper
export const cardTapScale = {
  whileTap: { scale: 0.98 },
  transition: { type: "spring", damping: 20, stiffness: 400 },
};

// Header slide down
export const headerVariants: Variants = {
  initial: { opacity: 0, y: -20 },
  enter: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  },
};
