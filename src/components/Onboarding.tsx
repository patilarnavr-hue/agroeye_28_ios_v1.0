import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Droplet, Sprout, Calendar, Leaf, ArrowRight, ArrowLeft,
  Wifi, Map, Trophy, Bug, Sparkles, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface OnboardingProps {
  open: boolean;
  onComplete: () => void;
}

const steps = [
  {
    title: "Welcome to AgroEye",
    subtitle: "Your Smart Farming Companion",
    icon: Leaf,
    description: "Track soil moisture, fertility, weather, pests, and manage watering schedules — all from your phone.",
    gradient: "from-emerald-500 to-green-600",
    bgPattern: "🌾🌿🍃🌱",
    route: null,
  },
  {
    title: "Soil Moisture",
    subtitle: "Monitor Water Levels",
    icon: Droplet,
    description: "See real-time soil moisture levels. Add manual readings or connect IoT sensors for automatic tracking.",
    tip: "Pair a sensor by entering its code or scanning a QR code on the device.",
    gradient: "from-blue-500 to-cyan-500",
    bgPattern: "💧🌊💦",
    route: "/moisture",
  },
  {
    title: "Your Crops",
    subtitle: "Track & Manage Everything",
    icon: Sprout,
    description: "Add crops with photos, planting dates, and harvest estimates. Monitor health scores and compare performance.",
    tip: "Tap the Crops icon in the bottom bar to add your first crop.",
    gradient: "from-green-500 to-lime-500",
    bgPattern: "🌱🌿🍀",
    route: "/crops",
  },
  {
    title: "Watering Schedule",
    subtitle: "Never Miss a Session",
    icon: Calendar,
    description: "Create custom watering schedules for each day. Get reminders so your crops are always hydrated.",
    tip: "Set up your first schedule now — it takes 30 seconds!",
    gradient: "from-violet-500 to-purple-500",
    bgPattern: "⏰📅🔔",
    route: "/schedule",
  },
  {
    title: "Farm Map",
    subtitle: "Map Your Farmland",
    icon: Map,
    description: "Draw polygon boundaries on the satellite map to measure area. Place markers for sensors, crops, and zones.",
    tip: "Access Farm Map from Quick Actions on the dashboard.",
    gradient: "from-amber-500 to-orange-500",
    bgPattern: "🗺️📍🧭",
    route: "/farm-map",
  },
  {
    title: "IoT Sensors",
    subtitle: "Connect Your Hardware",
    icon: Wifi,
    description: "Pair moisture sensors by entering the sensor code or scanning its QR code. Data flows to your dashboard automatically.",
    tip: "Each sensor gets a unique code like AGRO-XXXX.",
    gradient: "from-teal-500 to-emerald-500",
    bgPattern: "📡🔌⚡",
    route: "/sensors",
  },
  {
    title: "AI & Pest Detection",
    subtitle: "Smart Farming Insights",
    icon: Bug,
    description: "Get AI-powered recommendations. Snap a photo of affected plants for instant pest and disease identification.",
    tip: "Ask Sprout 🌱 (our AI chatbot) any farming question!",
    gradient: "from-rose-500 to-pink-500",
    bgPattern: "🐛🔬🧠",
    route: "/pest-detection",
  },
  {
    title: "You're All Set!",
    subtitle: "Start Your Farming Journey",
    icon: Trophy,
    description: "Earn XP for adding readings, managing crops, and staying active. Climb the leaderboard and unlock achievements!",
    tip: "Check your rank on the Profile page.",
    gradient: "from-yellow-500 to-amber-500",
    bgPattern: "🏆⭐🎉",
    route: null,
  },
];

const Onboarding = ({ open, onComplete }: OnboardingProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("user_preferences")
      .upsert({ user_id: user.id, onboarding_completed: true });
    if (error) toast.error("Failed to save progress");
    else onComplete();
  };

  const handleTryIt = () => {
    const route = steps[currentStep].route;
    if (route) {
      handleComplete().then(() => navigate(route));
    }
  };

  if (!open) return null;

  const step = steps[currentStep];
  const StepIcon = step.icon;
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentStep}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute inset-0 flex flex-col"
        >
          {/* Hero section with gradient */}
          <div className={`relative flex-1 min-h-[45vh] bg-gradient-to-br ${step.gradient} flex flex-col items-center justify-center p-8 overflow-hidden`}>
            {/* Floating emoji pattern */}
            <div className="absolute inset-0 flex items-center justify-center opacity-10 text-8xl select-none pointer-events-none">
              <div className="animate-pulse">{step.bgPattern}</div>
            </div>

            {/* Skip button */}
            <button
              onClick={handleComplete}
              className="absolute top-6 right-6 text-white/70 hover:text-white text-sm font-medium transition-colors z-10"
            >
              Skip
            </button>

            {/* Step counter */}
            <div className="absolute top-6 left-6 text-white/70 text-sm font-medium z-10">
              {currentStep + 1} / {steps.length}
            </div>

            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", delay: 0.1, stiffness: 200 }}
              className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-6 shadow-2xl"
            >
              <StepIcon className="w-12 h-12 text-white" />
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-3xl md:text-4xl font-bold text-white text-center"
            >
              {step.title}
            </motion.h1>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-white/80 text-lg mt-2 text-center"
            >
              {step.subtitle}
            </motion.p>
          </div>

          {/* Content section */}
          <div className="flex-1 bg-background p-6 md:p-8 flex flex-col justify-between">
            <div className="space-y-4 max-w-md mx-auto w-full">
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="text-base md:text-lg text-foreground leading-relaxed"
              >
                {step.description}
              </motion.p>

              {step.tip && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-start gap-3"
                >
                  <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-primary font-medium">{step.tip}</p>
                </motion.div>
              )}

              {step.route && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.45 }}
                >
                  <Button
                    variant="outline"
                    onClick={handleTryIt}
                    className="w-full rounded-2xl h-11 group"
                  >
                    Try it now
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </motion.div>
              )}
            </div>

            {/* Bottom navigation */}
            <div className="max-w-md mx-auto w-full space-y-4 mt-6">
              {/* Progress dots */}
              <div className="flex items-center justify-center gap-1.5">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 rounded-full transition-all duration-500 ${
                      index === currentStep
                        ? "w-8 bg-primary"
                        : index < currentStep
                        ? "w-2 bg-primary/50"
                        : "w-2 bg-muted-foreground/20"
                    }`}
                  />
                ))}
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                {!isFirst && (
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    className="flex-1 rounded-2xl h-12 text-base"
                  >
                    <ArrowLeft className="w-5 h-5 mr-2" /> Back
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  className={`rounded-2xl h-12 text-base ${isFirst ? "w-full" : "flex-1"}`}
                >
                  {isLast ? (
                    "Let's Go! 🚀"
                  ) : isFirst ? (
                    <>Get Started <ArrowRight className="w-5 h-5 ml-2" /></>
                  ) : (
                    <>Next <ArrowRight className="w-5 h-5 ml-2" /></>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Onboarding;
