export interface CropIntelligenceResult {
  healthScore: number;
  riskIndex: number;
  yieldPrediction: "poor" | "below_average" | "average" | "good" | "excellent";
  pestRisk: "low" | "moderate" | "high" | "critical";
  harvestReadiness: number; // 0-100
}

interface CropIntelligenceInput {
  moisture: number | null;
  fertility: number | null;
  temperature: number | null;
  humidity: number | null;
  growthDays: number;
  expectedGrowthDays: number;
}

export function calculateCropIntelligence(
  input: CropIntelligenceInput
): CropIntelligenceResult {
  const {
    moisture,
    fertility,
    temperature,
    humidity,
    growthDays,
    expectedGrowthDays,
  } = input;

  // 1. Health Score (0-100)
  const moistureScore =
    moisture !== null
      ? moisture >= 40 && moisture <= 70
        ? 100
        : moisture < 40
        ? moisture * 2.5
        : Math.max(0, (100 - moisture) * 2.5)
      : 50;

  const fertilityScore = fertility ?? 50;

  const tempScore =
    temperature !== null
      ? temperature >= 18 && temperature <= 32
        ? 100
        : temperature < 18
        ? Math.max(0, temperature * 5)
        : Math.max(0, (50 - temperature) * 4)
      : 70;

  const healthScore = Math.round(
    moistureScore * 0.35 + fertilityScore * 0.35 + tempScore * 0.3
  );

  // 2. Risk Index
  const riskIndex = Math.max(0, Math.min(100, 100 - healthScore));

  // 3. Yield Prediction
  let yieldPrediction: CropIntelligenceResult["yieldPrediction"];
  if (healthScore >= 85) yieldPrediction = "excellent";
  else if (healthScore >= 70) yieldPrediction = "good";
  else if (healthScore >= 55) yieldPrediction = "average";
  else if (healthScore >= 35) yieldPrediction = "below_average";
  else yieldPrediction = "poor";

  // 4. Pest Risk (high humidity + warm temp = higher risk)
  let pestRisk: CropIntelligenceResult["pestRisk"] = "low";
  const h = humidity ?? 50;
  const t = temperature ?? 25;
  if (h > 80 && t > 28) pestRisk = "critical";
  else if (h > 70 && t > 25) pestRisk = "high";
  else if (h > 60 || t > 30) pestRisk = "moderate";

  // 5. Harvest Readiness
  const growthProgress =
    expectedGrowthDays > 0
      ? Math.min(100, (growthDays / expectedGrowthDays) * 100)
      : 0;
  const harvestReadiness = Math.round(
    growthProgress * 0.6 + healthScore * 0.4
  );

  return {
    healthScore,
    riskIndex,
    yieldPrediction,
    pestRisk,
    harvestReadiness,
  };
}
