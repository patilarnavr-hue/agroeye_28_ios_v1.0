export interface IrrigationRecommendation {
  shouldIrrigate: boolean;
  durationMinutes: number;
  urgency: "none" | "low" | "medium" | "high" | "critical";
  message: string;
}

export function calculateIrrigationDuration(
  currentMoisture: number,
  optimalMoisture: number = 55
): IrrigationRecommendation {
  const deficit = optimalMoisture - currentMoisture;

  if (deficit <= 0) {
    return {
      shouldIrrigate: false,
      durationMinutes: 0,
      urgency: "none",
      message: "Soil moisture is at or above optimal levels.",
    };
  }

  // Dynamic duration: ~1 min per 2% deficit, min 5, max 60
  const rawDuration = Math.ceil(deficit / 2);
  const durationMinutes = Math.min(60, Math.max(5, rawDuration));

  let urgency: IrrigationRecommendation["urgency"] = "low";
  if (currentMoisture < 15) urgency = "critical";
  else if (currentMoisture < 25) urgency = "high";
  else if (currentMoisture < 40) urgency = "medium";

  return {
    shouldIrrigate: true,
    durationMinutes,
    urgency,
    message:
      urgency === "critical"
        ? "Soil critically dry! Irrigate immediately."
        : urgency === "high"
        ? "Soil is very dry. Irrigation recommended soon."
        : urgency === "medium"
        ? "Moisture below optimal. Schedule irrigation."
        : "Slight deficit. Consider light watering.",
  };
}

export interface PumpEvent {
  triggerType: "auto" | "manual";
  durationMinutes: number;
  moistureBefore: number;
}

export class PumpControlService {
  private autoMode: boolean = false;

  setAutoMode(enabled: boolean) {
    this.autoMode = enabled;
  }

  isAutoMode() {
    return this.autoMode;
  }

  createEvent(
    currentMoisture: number,
    trigger: "auto" | "manual" = "manual",
    optimalMoisture: number = 55
  ): PumpEvent | null {
    const rec = calculateIrrigationDuration(currentMoisture, optimalMoisture);
    if (!rec.shouldIrrigate && trigger === "auto") return null;

    return {
      triggerType: trigger,
      durationMinutes: rec.durationMinutes || 5,
      moistureBefore: currentMoisture,
    };
  }
}
