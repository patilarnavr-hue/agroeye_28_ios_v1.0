import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getAIConfig() {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (openaiKey) return { apiKey: openaiKey, url: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini" };
  if (lovableKey) return { apiKey: lovableKey, url: "https://ai.gateway.lovable.dev/v1/chat/completions", model: "google/gemini-2.5-flash" };
  throw new Error("No AI API key configured.");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const body = await req.json().catch(() => ({}));
    const appContext = body.appContext || {};

    // Fetch ALL user data for comprehensive recommendations
    const [
      moistureRes, fertilityRes, cropsRes, sensorsRes,
      schedulesRes, alertsRes, weatherRes, healthRes,
      profileRes, pestRes, irrigationRes, storageRes, plotsRes,
    ] = await Promise.all([
      supabase.from("moisture_readings").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(15),
      supabase.from("fertility_readings").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
      supabase.from("crops").select("*").eq("user_id", userId).eq("is_active", true),
      supabase.from("sensors").select("*").eq("user_id", userId),
      supabase.from("watering_schedules").select("*").eq("user_id", userId),
      supabase.from("alerts").select("*").eq("user_id", userId).eq("is_read", false).limit(10),
      supabase.from("weather_data").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1),
      supabase.from("health_scores").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("pest_detections").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
      supabase.from("irrigation_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
      supabase.from("storage_requests").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
      supabase.from("farmland_plots").select("*").eq("user_id", userId),
    ]);

    const moisture = moistureRes.data || [];
    const fertility = fertilityRes.data || [];
    const crops = cropsRes.data || [];
    const sensors = sensorsRes.data || [];
    const schedules = schedulesRes.data || [];
    const alerts = alertsRes.data || [];
    const weather = weatherRes.data?.[0] || null;
    const health = healthRes.data || [];
    const profile = profileRes.data || {};
    const pests = pestRes.data || [];
    const irrigations = irrigationRes.data || [];
    const storageReqs = storageRes.data || [];
    const plots = plotsRes.data || [];
    const pumps = appContext.pumps || [];

    const avgMoisture = moisture.length > 0
      ? moisture.reduce((s: number, r: any) => s + Number(r.moisture_level), 0) / moisture.length : null;
    const avgFertility = fertility.length > 0
      ? fertility.reduce((s: number, r: any) => s + Number(r.overall_fertility || 0), 0) / fertility.length : null;

    const dataContext = `
COMPLETE FARM DATA FOR ${profile.full_name || "Farmer"}:
Location: ${profile.location || appContext.location || "Unknown"}

SOIL MOISTURE:
- Latest: ${moisture[0]?.moisture_level ?? "No data"}%
- 15-reading average: ${avgMoisture?.toFixed(1) ?? "N/A"}%
- Trend: ${moisture.length > 2 ? (moisture[0].moisture_level > moisture[2].moisture_level ? "Rising" : "Falling") : "Unknown"}
- Readings: ${moisture.slice(0, 5).map((r: any) => `${r.moisture_level}%`).join(", ")}

SOIL FERTILITY:
- Latest Overall: ${fertility[0]?.overall_fertility ?? "No data"}%
${fertility[0] ? `- N: ${fertility[0].nitrogen_level}% | P: ${fertility[0].phosphorus_level}% | K: ${fertility[0].potassium_level}%` : ""}
- Average: ${avgFertility?.toFixed(1) ?? "N/A"}%

ACTIVE CROPS (${crops.length}):
${crops.map((c: any) => `- ${c.name} (${c.crop_type}) planted ${c.planting_date || "unknown"}, harvest ${c.expected_harvest_date || "unknown"}`).join("\n") || "None"}

SENSORS (${sensors.filter((s: any) => s.is_active).length} active / ${sensors.length} total):
${sensors.map((s: any) => `- ${s.sensor_name} (${s.sensor_type}): ${s.is_active ? "Active" : "OFFLINE"}, last=${s.last_reading ?? "N/A"}`).join("\n") || "None"}

PUMPS (${pumps.length}):
${pumps.map((p: any) => `- ${p.name} (${p.type}): ${p.status}, auto=${p.autoMode}`).join("\n") || "None"}

SCHEDULES (${schedules.length}):
${schedules.map((s: any) => `- ${s.title}: ${s.time_of_day} on ${s.days_of_week?.join(",")} (${s.is_enabled ? "active" : "disabled"})`).join("\n") || "None"}

RECENT IRRIGATIONS:
${irrigations.slice(0, 5).map((e: any) => `- ${e.duration_minutes}min (${e.trigger_type}) before=${e.moisture_before}% after=${e.moisture_after}%`).join("\n") || "None"}

PEST DETECTIONS:
${pests.map((p: any) => `- ${p.disease_name} (${p.severity}, ${p.confidence} conf) ${new Date(p.created_at).toLocaleDateString()}`).join("\n") || "None"}

HEALTH SCORES:
${health.slice(0, 3).map((h: any) => `- Overall: ${h.overall_score}% | Moisture: ${h.moisture_score}% | Fertility: ${h.fertility_score}%`).join("\n") || "None"}

WEATHER:
${weather ? `${weather.temperature}°C, ${weather.humidity}% humidity, ${weather.weather_condition}, wind ${weather.wind_speed}km/h, precip ${weather.precipitation}mm at ${weather.location}` : "No data"}

UNREAD ALERTS: ${alerts.length}
${alerts.slice(0, 5).map((a: any) => `- [${a.severity}] ${a.title}`).join("\n") || "None"}

FARM PLOTS: ${plots.length} (total ${plots.reduce((s: number, p: any) => s + (p.area_sqm || 0), 0) / 4047} acres approx)

STORAGE REQUESTS:
${storageReqs.map((r: any) => `- ${r.crop_type}: ${r.quantity_kg}kg, status=${r.status}, score=${r.suitability_score ?? "pending"}`).join("\n") || "None"}
`;

    const ai = getAIConfig();

    const response = await fetch(ai.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${ai.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ai.model,
        messages: [
          {
            role: "system",
            content: `You are an expert agricultural advisor with COMPLETE access to this farmer's data. Provide 3-5 highly specific, personalized, actionable recommendations.

Reference SPECIFIC crop names, ACTUAL sensor readings, REAL dates, and EXACT numbers from the data.

Format as JSON array:
[
  {
    "priority": "high" | "medium" | "low",
    "category": "watering" | "fertilization" | "monitoring" | "maintenance",
    "title": "Brief specific title mentioning their actual crop/sensor",
    "description": "Detailed action referencing their actual data points",
    "impact": "Expected outcome with specific numbers"
  }
]

Priorities:
- HIGH: Critical issues (dry soil <25%, offline sensors, active pest detections, overdue harvests)
- MEDIUM: Optimization opportunities (suboptimal NPK, schedule improvements, upcoming weather)  
- LOW: Long-term improvements (add sensors, expand plots, try new crops)

Consider: season, weather forecast, pest history, irrigation efficiency, soil trends, and crop growth stage.`
          },
          { role: "user", content: `Generate personalized recommendations from this data:\n\n${dataContext}` }
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI error:", response.status, await response.text());
      return new Response(JSON.stringify({ error: "Failed to generate recommendations" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    let recommendations;
    try {
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) || aiResponse.match(/\[([\s\S]*?)\]/);
      recommendations = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : aiResponse);
    } catch {
      recommendations = [{
        priority: "medium", category: "monitoring",
        title: "Keep monitoring your crops",
        description: "Continue tracking moisture and fertility levels regularly.",
        impact: "Consistent monitoring prevents issues before they become serious."
      }];
    }

    return new Response(JSON.stringify({ recommendations, dataContext }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Recommendations error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
