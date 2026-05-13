import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Droplet, Power, Timer, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  calculateIrrigationDuration,
  PumpControlService,
} from "@/engine/irrigationEngine";
import { hapticFeedback } from "@/utils/haptics";
import { sendNotification } from "@/utils/pushNotifications";

interface IrrigationMiniWidgetProps {
  currentMoisture: number | null;
  cropId?: string | null;
  className?: string;
}

const pumpService = new PumpControlService();

const IrrigationMiniWidget = ({ currentMoisture, cropId, className }: IrrigationMiniWidgetProps) => {
  const [autoMode, setAutoMode] = useState(false);
  const [pumpRunning, setPumpRunning] = useState(false);

  const moisture = currentMoisture ?? 0;
  const rec = calculateIrrigationDuration(moisture);

  const urgencyBg: Record<string, string> = {
    none: "bg-primary/10 text-primary",
    low: "bg-primary/10 text-primary",
    medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    high: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    critical: "bg-destructive/10 text-destructive",
  };

  const handleToggleAuto = (checked: boolean) => {
    setAutoMode(checked);
    pumpService.setAutoMode(checked);
    hapticFeedback("light");
    toast.info(checked ? "Auto irrigation ON" : "Auto irrigation OFF");
  };

  const handleManualPump = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    hapticFeedback("medium");
    setPumpRunning(true);
    const event = pumpService.createEvent(moisture, "manual");
    if (!event) { setPumpRunning(false); return; }

    await (supabase as any).from("irrigation_events").insert({
      user_id: user.id,
      crop_id: cropId || null,
      trigger_type: event.triggerType,
      duration_minutes: event.durationMinutes,
      moisture_before: event.moistureBefore,
      status: "completed",
    });

    sendNotification({
      title: "💧 Irrigation Complete",
      body: `Pump ran for ${event.durationMinutes} min. Moisture was at ${moisture}%.`,
      category: "irrigation",
    });

    toast.success(`Pump ran for ${event.durationMinutes} min`);
    setTimeout(() => {
      setPumpRunning(false);
      hapticFeedback("success");
    }, 2000);
  };

  return (
    <Card className={cn("glass-card", className)}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Droplet className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-foreground">Smart Irrigation</span>
          </div>
          <Badge className={cn("text-[10px] h-4 px-1.5", urgencyBg[rec.urgency])}>
            {rec.urgency}
          </Badge>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <div className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
            pumpRunning 
              ? "bg-primary text-primary-foreground animate-pulse" 
              : "bg-muted text-muted-foreground"
          )}>
            <Power className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-foreground">
              Pump {pumpRunning ? "Running" : "Idle"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {rec.shouldIrrigate 
                ? `Recommended: ${rec.durationMinutes} min` 
                : "No irrigation needed"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-muted-foreground" />
            <Switch
              checked={autoMode}
              onCheckedChange={handleToggleAuto}
              className="scale-75"
            />
          </div>
        </div>

        <Button
          size="sm"
          className="w-full rounded-xl h-8 text-xs"
          disabled={pumpRunning}
          onClick={handleManualPump}
        >
          {pumpRunning ? (
            <>
              <Timer className="w-3 h-3 mr-1 animate-spin" /> Running...
            </>
          ) : (
            <>
              <Power className="w-3 h-3 mr-1" /> Run Pump Now
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default IrrigationMiniWidget;
