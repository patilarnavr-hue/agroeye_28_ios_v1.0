import { motion } from "framer-motion";
import { Sprout } from "lucide-react";

const SplashScreen = () => (
  <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-primary/5 via-background to-primary/10">
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center gap-5"
    >
      {/* App Icon */}
      <div className="relative">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-28 h-28 rounded-[32px] bg-primary/15 flex items-center justify-center shadow-lg shadow-primary/20 border border-primary/10"
        >
          <motion.div
            animate={{ rotate: [0, 8, -8, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          >
            <Sprout className="w-14 h-14 text-primary" strokeWidth={1.8} />
          </motion.div>
        </motion.div>
        {/* Glow ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 0.4, 0], scale: [0.8, 1.3, 1.5] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeOut" }}
          className="absolute inset-0 rounded-[32px] border-2 border-primary/30"
        />
      </div>

      {/* App Name */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold tracking-tight text-foreground">AgroEye</h1>
        <p className="text-xs text-muted-foreground mt-1 tracking-widest uppercase">Smart Farming</p>
      </motion.div>

      {/* Loading bar */}
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 140, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="h-1 rounded-full bg-primary/15 overflow-hidden"
      >
        <motion.div
          animate={{ x: ["-100%", "100%"] }}
          transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
          className="h-full w-1/2 rounded-full bg-primary"
        />
      </motion.div>
    </motion.div>

    {/* Bottom branding */}
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="absolute bottom-10 text-[10px] text-muted-foreground/60 tracking-wider"
    >
      © 2026 AgroEye · v2.0
    </motion.p>
  </div>
);

export default SplashScreen;
