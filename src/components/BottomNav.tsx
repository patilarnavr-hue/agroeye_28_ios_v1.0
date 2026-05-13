import { Home, Droplet, Clock, Sprout, User } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { hapticFeedback } from "@/utils/haptics";

const BottomNav = () => {
  const { t } = useTranslation();
  
  const navItems = [
    { icon: Home, label: t("nav.home"), path: "/" },
    { icon: Droplet, label: t("nav.moisture"), path: "/moisture" },
    { icon: Sprout, label: t("nav.crops"), path: "/crops" },
    { icon: Clock, label: t("nav.schedule"), path: "/schedule" },
    { icon: User, label: t("nav.profile"), path: "/profile" },
  ];

  const navContent = (
    <nav className="fixed inset-x-0 z-50 px-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] flex justify-center">
      <motion.div
        className="glass-nav rounded-[22px] w-full max-w-md"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 24, stiffness: 260, delay: 0.2 }}
      >
        <div className="flex justify-around items-center h-[58px] px-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => hapticFeedback("light")}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 flex-1 rounded-2xl transition-all duration-200",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn("flex items-center justify-center w-9 h-7 rounded-full transition-all duration-300 relative", isActive && "bg-primary/12")}>
                    <item.icon className="w-[20px] h-[20px]" strokeWidth={isActive ? 2.2 : 1.6} />
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary"
                        transition={{ type: "spring", damping: 20, stiffness: 300 }}
                      />
                    )}
                  </div>
                  <span className={cn("text-[10px] transition-all duration-200", isActive ? "font-semibold" : "font-medium")}>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </motion.div>
    </nav>
  );

  if (typeof document === "undefined") return null;

  return createPortal(navContent, document.body);
};

export default BottomNav;
