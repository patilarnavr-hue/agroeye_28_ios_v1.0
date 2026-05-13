import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Droplet, Power, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  calculateIrrigationDuration,
  PumpControlService,
} from "@/engine/irrigationEngine";

interface SmartIrrigationCardProps {
  currentMoisture: number | null;
  cropId?: string | null;
}

const pumpService = new PumpControlService();

const SmartIrrigationCard = ({ currentMoisture, cropId }: SmartIrrigationCardProps) => {
  const [autoMode, setAutoMode] = useState(false);
  const [pumpRunning, setPumpRunning] = useState(false);

  const moisture = currentMoisture ?? 0;
  const rec = calculateIrrigationDuration(moisture);

  const urgencyColors: Record<string, string> = {
    none: "bg-primary/10 text-primary",
    low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    critical: "bg-destructive/10 text-destructive",
  };

  const handleToggleAuto = (checked: boolean) => {
    setAutoMode(checked);
    pumpService.setAutoMode(checked);
    toast.info(checked ? "Auto irrigation ON" : "Auto irrigation OFF");
  };

  const handleManualPump = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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

    toast.success(`Pump ran for ${event.durationMinutes} min`);
    setTimeout(() => setPumpRunning(false), 2000);
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Droplet className="w-4 h-4" /> Smart Irrigation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Power className={`w-4 h-4 ${pumpRunning ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
            <span className="text-sm font-medium">
              Pump {pumpRunning ? "Running" : "Idle"}
            </span>
          </div>
          <Badge className={urgencyColors[rec.urgency]}>{rec.urgency}</Badge>
        </div>

        <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Recommended</span>
          </div>
          <span className="font-bold text-sm">
            {rec.shouldIrrigate ? `${rec.durationMinutes} min` : "Not needed"}
          </span>
        </div>

        <p className="text-xs text-muted-foreground">{rec.message}</p>

        <div className="flex items-center justify-between">
          <span className="text-sm">Auto Mode</span>
          <Switch checked={autoMode} onCheckedChange={handleToggleAuto} />
        </div>

        <Button
          className="w-full rounded-xl"
          disabled={pumpRunning}
          onClick={handleManualPump}
        >
          {pumpRunning ? "Running..." : "Run Pump Now"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SmartIrrigationCard;
