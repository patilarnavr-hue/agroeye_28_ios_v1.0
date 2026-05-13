export interface StorageSuitability {
  score: number; // 0-100
  recommendation: "safe" | "dry_first" | "not_recommended";
  message: string;
}

const CROP_STORAGE_CONDITIONS: Record<string, { maxHumidity: number; maxTemp: number; minTemp: number }> = {
  rice: { maxHumidity: 65, maxTemp: 30, minTemp: 10 },
  wheat: { maxHumidity: 60, maxTemp: 28, minTemp: 5 },
  corn: { maxHumidity: 65, maxTemp: 30, minTemp: 8 },
  vegetables: { maxHumidity: 85, maxTemp: 15, minTemp: 2 },
  fruits: { maxHumidity: 90, maxTemp: 12, minTemp: 0 },
  pulses: { maxHumidity: 60, maxTemp: 28, minTemp: 8 },
  default: { maxHumidity: 70, maxTemp: 28, minTemp: 5 },
};

export function calculateStorageSuitability(
  humidity: number,
  temperature: number,
  cropType: string
): StorageSuitability {
  const conditions = CROP_STORAGE_CONDITIONS[cropType.toLowerCase()] ?? CROP_STORAGE_CONDITIONS.default;

  let score = 100;

  // Humidity penalty
  if (humidity > conditions.maxHumidity) {
    score -= (humidity - conditions.maxHumidity) * 3;
  }

  // Temperature penalty
  if (temperature > conditions.maxTemp) {
    score -= (temperature - conditions.maxTemp) * 4;
  } else if (temperature < conditions.minTemp) {
    score -= (conditions.minTemp - temperature) * 3;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let recommendation: StorageSuitability["recommendation"];
  let message: string;

  if (score >= 70) {
    recommendation = "safe";
    message = `Conditions are suitable for storing ${cropType}. Maintain current temperature and humidity.`;
  } else if (score >= 40) {
    recommendation = "dry_first";
    message = `Humidity is elevated. Dry ${cropType} thoroughly before storage to prevent spoilage.`;
  } else {
    recommendation = "not_recommended";
    message = `Current conditions are unsuitable for ${cropType} storage. High risk of spoilage or pest infestation.`;
  }

  return { score, recommendation, message };
}
