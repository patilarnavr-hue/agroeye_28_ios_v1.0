/**
 * Local AI Fallback
 * 
 * Provides rule-based AI alternatives when edge functions are unavailable.
 * These are simpler but work completely offline.
 */

// ─── AI Recommendations (local) ───────────────────────────────

interface Recommendation {
  priority: "high" | "medium" | "low";
  category: "watering" | "fertilization" | "monitoring" | "maintenance";
  title: string;
  description: string;
  impact: string;
}

export function generateLocalRecommendations(
  moisture: number | null,
  fertility: number | null,
  sensorCount: number
): Recommendation[] {
  const recs: Recommendation[] = [];

  if (moisture !== null) {
    if (moisture < 20) {
      recs.push({
        priority: "high",
        category: "watering",
        title: "Critically dry soil — water immediately",
        description: `Soil moisture is at ${moisture}%, well below the 30% minimum. Water deeply this evening to avoid crop stress. Apply 20-25mm of water.`,
        impact: "Prevents wilting and permanent crop damage",
      });
    } else if (moisture < 35) {
      recs.push({
        priority: "medium",
        category: "watering",
        title: "Soil getting dry — schedule irrigation",
        description: `Moisture at ${moisture}% is approaching the stress zone. Plan to irrigate within the next 12 hours. Morning watering is most efficient.`,
        impact: "Maintains optimal growing conditions",
      });
    } else if (moisture > 80) {
      recs.push({
        priority: "high",
        category: "watering",
        title: "Soil is waterlogged — reduce watering",
        description: `Moisture at ${moisture}% is too high. This can cause root rot. Stop watering and ensure drainage is working.`,
        impact: "Prevents root diseases and nutrient washout",
      });
    } else {
      recs.push({
        priority: "low",
        category: "monitoring",
        title: "Moisture levels are healthy",
        description: `Current moisture at ${moisture}% is in the optimal range. Continue your current watering schedule.`,
        impact: "Consistent growth and healthy roots",
      });
    }
  }

  if (fertility !== null) {
    if (fertility < 30) {
      recs.push({
        priority: "high",
        category: "fertilization",
        title: "Low soil fertility — add nutrients",
        description: `Fertility at ${fertility}% is low. Apply balanced NPK fertilizer (10-10-10) or compost. For organic: add well-rotted manure.`,
        impact: "Boosts plant growth and yield potential",
      });
    } else if (fertility < 55) {
      recs.push({
        priority: "medium",
        category: "fertilization",
        title: "Moderate fertility — consider top dressing",
        description: `Fertility at ${fertility}% could be improved. A light nitrogen-rich top dressing or foliar spray would help.`,
        impact: "Optimizes nutrient availability for crops",
      });
    }
  }

  if (sensorCount === 0) {
    recs.push({
      priority: "medium",
      category: "monitoring",
      title: "Add sensors for accurate data",
      description: "Connect at least one soil moisture sensor for real-time monitoring. ESP32 + capacitive sensor is the cheapest option (~$5).",
      impact: "Enables automated alerts and precision farming",
    });
  }

  recs.push({
    priority: "low",
    category: "maintenance",
    title: "Weekly crop inspection",
    description: "Walk your fields and check for pests, disease signs, and weed growth. Early detection saves crops.",
    impact: "Catches problems before they spread",
  });

  return recs.slice(0, 5);
}

// ─── Chat Assistant (local) ──────────────────────────────────

const CHAT_RESPONSES: Record<string, string> = {
  "moisture": "Check your dashboard for current soil moisture 💧 If it's below 30%, water your crops this evening!",
  "water": "Best time to water is early morning or evening 🌅 Avoid midday — water evaporates too fast.",
  "fertilize": "For most crops, apply NPK fertilizer every 2-3 weeks during growing season 🌱 Use half dose for seedlings.",
  "pest": "Common signs: holes in leaves 🐛, yellowing, sticky residue. Try neem oil spray as a first organic treatment.",
  "disease": "Look for spots, mold, or wilting 🍂 Remove affected leaves. Good air circulation helps prevent disease.",
  "harvest": "Most vegetables are ready 60-90 days after planting 🥬 Check if fruit is firm and fully colored.",
  "weather": "Check the weather widget on your dashboard ☀️ Plan watering around rain forecasts.",
  "sensor": "Go to Sensors page to add a new sensor 📡 Scan the QR code on your device or add manually.",
  "help": "I can help with: watering, fertilizing, pest control, disease detection, harvest timing, and sensor setup! 🌾",
};

export function getLocalChatResponse(message: string): string {
  const lower = message.toLowerCase();
  
  for (const [key, response] of Object.entries(CHAT_RESPONSES)) {
    if (lower.includes(key)) return response;
  }

  return "I'm running in offline mode right now 🌱 I can help with basic questions about watering, pests, fertilizing, and sensors. Connect to the internet for full AI-powered assistance!";
}

// ─── Yield Prediction (local) ────────────────────────────────

interface YieldPrediction {
  estimated_yield: string;
  confidence: string;
  factors: { name: string; impact: string; status: string }[];
  recommendations: string[];
  timeline: string;
}

export function generateLocalYieldPrediction(
  moisture: number | null,
  fertility: number | null,
  healthScore: number | null,
  cropType: string
): YieldPrediction {
  const factors: { name: string; impact: string; status: string }[] = [];
  let score = 50; // base score

  if (moisture !== null) {
    if (moisture >= 30 && moisture <= 70) {
      factors.push({ name: "Soil Moisture", impact: "Optimal range", status: "Good" });
      score += 15;
    } else if (moisture < 30) {
      factors.push({ name: "Soil Moisture", impact: "Too dry — crop stress risk", status: "Critical" });
      score -= 20;
    } else {
      factors.push({ name: "Soil Moisture", impact: "Overwatered — root rot risk", status: "Warning" });
      score -= 10;
    }
  }

  if (fertility !== null) {
    if (fertility >= 50) {
      factors.push({ name: "Soil Fertility", impact: "Good nutrient levels", status: "Good" });
      score += 15;
    } else if (fertility >= 30) {
      factors.push({ name: "Soil Fertility", impact: "Moderate — needs improvement", status: "Warning" });
      score += 5;
    } else {
      factors.push({ name: "Soil Fertility", impact: "Poor — fertilization needed", status: "Critical" });
      score -= 15;
    }
  }

  if (healthScore !== null) {
    if (healthScore >= 70) {
      factors.push({ name: "Crop Health", impact: "Healthy growth indicators", status: "Good" });
      score += 10;
    } else {
      factors.push({ name: "Crop Health", impact: "Below optimal health", status: "Warning" });
    }
  }

  const yieldLabel = score > 70 ? "Above Average" : score > 45 ? "Average" : "Below Average";

  return {
    estimated_yield: yieldLabel,
    confidence: factors.length >= 3 ? "Medium" : "Low",
    factors,
    recommendations: [
      moisture !== null && moisture < 30 ? "Increase irrigation frequency" : "Maintain current watering schedule",
      fertility !== null && fertility < 50 ? "Apply balanced fertilizer (NPK 10-10-10)" : "Continue current nutrient program",
      "Monitor weather forecast for rain and adjust irrigation",
    ],
    timeline: `Based on ${cropType} typical growth cycle. Full prediction requires more sensor data.`,
  };
}

// ─── Pest Detection (local) ─────────────────────────────────

export function getLocalPestDetectionResult() {
  return {
    is_plant: false,
    disease_name: "Offline Mode",
    confidence: "N/A",
    severity: "N/A",
    description: "AI pest detection requires an internet connection. When online, take a close-up photo of the affected leaf for analysis.",
    treatment: [
      "For common pests: spray neem oil (2ml per liter of water)",
      "Remove visibly damaged leaves",
      "Check under leaves for eggs or insects",
    ],
    prevention: [
      "Maintain good air circulation between plants",
      "Remove weeds regularly",
      "Rotate crops each season",
    ],
  };
}

// ─── Weather (local fallback) ────────────────────────────────

export async function fetchWeatherLocal(lat: number, lon: number) {
  // Open-Meteo is free and works without API key
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`
    );
    if (!res.ok) throw new Error("Weather fetch failed");
    
    const data = await res.json();
    const c = data.current;
    
    const getCondition = (code: number) => {
      if (code === 0) return "Clear";
      if (code <= 3) return "Partly Cloudy";
      if (code <= 48) return "Foggy";
      if (code <= 67) return "Rainy";
      if (code <= 77) return "Snowy";
      if (code <= 82) return "Showers";
      if (code <= 99) return "Thunderstorm";
      return "Unknown";
    };

    return {
      current: {
        temperature: c.temperature_2m,
        humidity: c.relative_humidity_2m,
        condition: getCondition(c.weather_code),
        precipitation: c.precipitation,
        windSpeed: c.wind_speed_10m,
      },
      forecast: data.daily,
    };
  } catch {
    return null;
  }
}
