import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, ScanFace, Shield, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  isBiometricAvailable,
  getBiometricTypeName,
  registerBiometric,
  isBiometricEnabled,
  disableBiometric,
} from "@/utils/biometrics";
import { hapticFeedback } from "@/utils/haptics";
import { useDynamicIsland } from "@/components/DynamicIsland";
import { cn } from "@/lib/utils";

interface BiometricSetupProps {
  userId: string;
  onComplete?: () => void;
}

export function BiometricSetup({ userId, onComplete }: BiometricSetupProps) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [biometricName, setBiometricName] = useState("Biometrics");
  const dynamicIsland = useDynamicIsland();

  useEffect(() => {
    const checkAvailability = async () => {
      const available = await isBiometricAvailable();
      setIsAvailable(available);
      setIsEnabled(isBiometricEnabled());
      setBiometricName(getBiometricTypeName());
    };
    checkAvailability();
  }, []);

  const handleToggle = async (enabled: boolean) => {
    setIsLoading(true);
    hapticFeedback("medium");

    if (enabled) {
      const result = await registerBiometric(userId);
      
      if (result.success) {
        setIsEnabled(true);
        hapticFeedback("success");
        dynamicIsland.show({
          type: "success",
          title: `${biometricName} enabled`,
          message: "You can now unlock with biometrics",
          duration: 3000,
        });
        onComplete?.();
      } else {
        hapticFeedback("error");
        dynamicIsland.show({
          type: "error",
          title: "Setup failed",
          message: result.error || "Please try again",
          duration: 3000,
        });
      }
    } else {
      disableBiometric(userId);
      setIsEnabled(false);
      hapticFeedback("medium");
      dynamicIsland.show({
        type: "info",
        title: `${biometricName} disabled`,
        duration: 2000,
      });
    }

    setIsLoading(false);
  };

  if (!isAvailable) {
    return null;
  }

  const Icon = biometricName.includes("Face") ? ScanFace : Fingerprint;

  return (
    <Card className="glass-card-elevated">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Shield className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Biometric Login</CardTitle>
            <CardDescription className="text-xs">
              Quick & secure access with {biometricName}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center",
                "bg-gradient-to-br",
                isEnabled
                  ? "from-primary/20 to-primary/5 text-primary"
                  : "from-muted to-muted/50 text-muted-foreground"
              )}
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Icon className="w-6 h-6" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {biometricName}
              </p>
              <p className="text-xs text-muted-foreground">
                {isEnabled ? "Enabled" : "Disabled"}
              </p>
            </div>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={isLoading}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Biometric prompt for quick unlock
interface BiometricPromptProps {
  open: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export function BiometricPrompt({ open, onSuccess, onCancel }: BiometricPromptProps) {
  const [status, setStatus] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const biometricName = getBiometricTypeName();
  const Icon = biometricName.includes("Face") ? ScanFace : Fingerprint;

  useEffect(() => {
    if (open && status === "idle") {
      setStatus("scanning");
    }
  }, [open, status]);

  const handleRetry = () => {
    setStatus("scanning");
    hapticFeedback("light");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-[280px] bg-background rounded-3xl p-6 text-center"
          >
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </button>

            <motion.div
              animate={
                status === "scanning"
                  ? { scale: [1, 1.1, 1], opacity: [1, 0.7, 1] }
                  : {}
              }
              transition={{ repeat: Infinity, duration: 1.5 }}
              className={cn(
                "w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center",
                status === "success" && "bg-primary/20 text-primary",
                status === "error" && "bg-destructive/20 text-destructive",
                status === "scanning" && "bg-primary/20 text-primary",
                status === "idle" && "bg-muted text-muted-foreground"
              )}
            >
              {status === "success" ? (
                <Check className="w-10 h-10" />
              ) : (
                <Icon className="w-10 h-10" />
              )}
            </motion.div>

            <h3 className="text-lg font-semibold text-foreground mb-1">
              {status === "scanning" && `Use ${biometricName}`}
              {status === "success" && "Authenticated"}
              {status === "error" && "Try again"}
              {status === "idle" && biometricName}
            </h3>

            <p className="text-sm text-muted-foreground mb-4">
              {status === "scanning" && "Place your finger on the sensor"}
              {status === "success" && "Welcome back!"}
              {status === "error" && "Authentication failed"}
              {status === "idle" && "Tap to authenticate"}
            </p>

            {status === "error" && (
              <Button onClick={handleRetry} variant="outline" className="w-full">
                Try Again
              </Button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
