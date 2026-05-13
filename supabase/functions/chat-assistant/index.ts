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

async function gatherUserContext(supabase: any, userId: string, appContext: any) {
  const [
    moistureRes, fertilityRes, cropsRes, sensorsRes,
    schedulesRes, alertsRes, weatherRes, healthRes,
    profileRes, prefsRes, xpRes, pestRes,
    irrigationRes, storageRes, plotsRes,
  ] = await Promise.all([
    supabase.from("moisture_readings").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    supabase.from("fertility_readings").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
    supabase.from("crops").select("*").eq("user_id", userId).eq("is_active", true),
    supabase.from("sensors").select("*").eq("user_id", userId),
    supabase.from("watering_schedules").select("*").eq("user_id", userId),
    supabase.from("alerts").select("*").eq("user_id", userId).eq("is_read", false).order("created_at", { ascending: false }).limit(10),
    supabase.from("weather_data").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1),
    supabase.from("health_scores").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("user_preferences").select("*").eq("user_id", userId).single(),
    supabase.from("farmer_xp").select("*").eq("user_id", userId).single(),
    supabase.from("pest_detections").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
    supabase.from("irrigation_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    supabase.from("storage_requests").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
    supabase.from("farmland_plots").select("*").eq("user_id", userId),
  ]);

  // Log any errors from queries
  const allResults = { moistureRes, fertilityRes, cropsRes, sensorsRes, schedulesRes, alertsRes, weatherRes, healthRes, profileRes, prefsRes, xpRes, pestRes, irrigationRes, storageRes, plotsRes };
  for (const [name, res] of Object.entries(allResults)) {
    if ((res as any).error) {
      console.warn(`Query error for ${name}:`, (res as any).error.message);
    }
  }

  const moisture = moistureRes.data || [];
  const fertility = fertilityRes.data || [];
  const crops = cropsRes.data || [];
  const sensors = sensorsRes.data || [];
  const schedules = schedulesRes.data || [];
  const alerts = alertsRes.data || [];
  const weather = weatherRes.data?.[0] || null;
  const health = healthRes.data || [];
  const profile = profileRes.data || {};
  const prefs = prefsRes.data || {};
  const xp = xpRes.data || {};
  const pests = pestRes.data || [];
  const irrigations = irrigationRes.data || [];
  const storageReqs = storageRes.data || [];
  const plots = plotsRes.data || [];

  console.log("Data counts:", {
    moisture: moisture.length, fertility: fertility.length, crops: crops.length,
    sensors: sensors.length, schedules: schedules.length, alerts: alerts.length,
    weather: weather ? 1 : 0, health: health.length, pests: pests.length,
    irrigations: irrigations.length, storageReqs: storageReqs.length, plots: plots.length,
  });

  const activeSensors = sensors.filter((s: any) => s.is_active);
  const inactiveSensors = sensors.filter((s: any) => !s.is_active);

  // Pumps from client context
  const pumps = appContext?.pumps || [];

  const latestMoisture = moisture[0]?.moisture_level ?? "No data";
  const avgMoisture = moisture.length > 0
    ? (moisture.reduce((s: number, r: any) => s + Number(r.moisture_level), 0) / moisture.length).toFixed(1)
    : "No data";
  const latestFertility = fertility[0]?.overall_fertility ?? "No data";

  return `
=== FULL USER CONTEXT ===

👤 FARMER PROFILE:
- Name: ${profile.full_name || "Not set"}
- Email: ${profile.email || "Unknown"}
- Location: ${profile.location || "Not set"}
- Phone: ${profile.phone_number || "Not set"}
- Bio: ${profile.bio || "Not set"}

🏆 GAMIFICATION:
- Level: ${xp.level || 1}
- Total XP: ${xp.total_xp || 0}
- Streak: ${xp.streak_days || 0} days
- Last Activity: ${xp.last_activity_date || "Never"}

⚙️ PREFERENCES:
- App Language: ${appContext?.language || "en"}
- Theme: ${prefs.theme || "system"}
- Notifications: ${prefs.notifications_enabled ? "On" : "Off"}
- Moisture Alerts: ${prefs.notification_moisture ? "On" : "Off"}
- Schedule Alerts: ${prefs.notification_schedule ? "On" : "Off"}
- Onboarding Completed: ${prefs.onboarding_completed ? "Yes" : "No"}

💧 SOIL MOISTURE:
- Latest Reading: ${latestMoisture}%
- Average (last 10): ${avgMoisture}%
- Status: ${typeof latestMoisture === "number" ? (latestMoisture < 30 ? "DRY - Needs water!" : latestMoisture < 60 ? "Optimal" : "Overwatered") : "Unknown"}
- Trend: ${moisture.length > 1 ? (moisture[0].moisture_level > moisture[moisture.length - 1].moisture_level ? "Increasing" : "Decreasing") : "Insufficient data"}
- Recent readings: ${moisture.slice(0, 5).map((r: any) => `${r.moisture_level}% (${new Date(r.created_at).toLocaleDateString()})`).join(", ") || "None"}

🌱 SOIL FERTILITY:
- Latest Overall: ${latestFertility}%
${fertility[0] ? `- Nitrogen (N): ${fertility[0].nitrogen_level}%\n- Phosphorus (P): ${fertility[0].phosphorus_level}%\n- Potassium (K): ${fertility[0].potassium_level}%` : "- No NPK data available"}

🌾 ACTIVE CROPS (${crops.length}):
${crops.length > 0 ? crops.map((c: any) => `- ${c.name} (${c.crop_type}) | Planted: ${c.planting_date || "Unknown"} | Harvest: ${c.expected_harvest_date || "Unknown"} | Location: ${c.location || "Unset"}`).join("\n") : "- No active crops"}

📡 SENSORS (${activeSensors.length} active, ${inactiveSensors.length} inactive):
${activeSensors.length > 0 ? activeSensors.map((s: any) => `- ${s.sensor_name} (${s.sensor_type}) | Code: ${s.sensor_code} | Last: ${s.last_reading ?? "N/A"} at ${s.last_reading_at ? new Date(s.last_reading_at).toLocaleString() : "Never"} | GPS: ${s.latitude ? `${s.latitude}, ${s.longitude}` : "No location"}`).join("\n") : "- No active sensors"}

🔌 PUMPS (${pumps.length}):
${pumps.length > 0 ? pumps.map((p: any) => `- ${p.name} (${p.type}) | Code: ${p.code} | Status: ${p.status} | Auto: ${p.autoMode ? "On" : "Off"} | Flow: ${p.flowRate}L/min`).join("\n") : "- No pumps connected"}

📅 WATERING SCHEDULES (${schedules.length}):
${schedules.length > 0 ? schedules.map((s: any) => `- ${s.title}: ${s.time_of_day} on ${s.days_of_week?.join(", ")} | ${s.is_enabled ? "Active" : "Disabled"}`).join("\n") : "- No schedules set"}

💦 RECENT IRRIGATIONS:
${irrigations.length > 0 ? irrigations.slice(0, 5).map((e: any) => `- ${new Date(e.created_at).toLocaleDateString()}: ${e.duration_minutes}min (${e.trigger_type}) | Before: ${e.moisture_before ?? "?"}% → After: ${e.moisture_after ?? "?"}%`).join("\n") : "- No irrigation history"}

🐛 RECENT PEST DETECTIONS:
${pests.length > 0 ? pests.map((p: any) => `- ${p.disease_name} (${p.severity || "unknown"} severity, ${p.confidence || "?"} confidence) on ${new Date(p.created_at).toLocaleDateString()}${p.treatment ? ` | Treatment: ${p.treatment.join(", ")}` : ""}`).join("\n") : "- No pest detections"}

🏥 CROP HEALTH SCORES:
${health.length > 0 ? health.slice(0, 3).map((h: any) => `- Overall: ${h.overall_score}% | Moisture: ${h.moisture_score}% | Fertility: ${h.fertility_score}% | Weather: ${h.weather_score ?? "N/A"}% (${new Date(h.created_at).toLocaleDateString()})`).join("\n") : "- No health scores"}

🌤️ WEATHER:
${weather ? `- Location: ${weather.location}\n- Temperature: ${weather.temperature}°C\n- Humidity: ${weather.humidity}%\n- Condition: ${weather.weather_condition}\n- Wind: ${weather.wind_speed} km/h\n- Precipitation: ${weather.precipitation} mm` : "- No stored weather data"}
${appContext?.liveWeather ? `\n🌡️ LIVE WEATHER (from device):
- Location: ${appContext.liveWeather.location}
- Temperature: ${appContext.liveWeather.temperature}°C
- Humidity: ${appContext.liveWeather.humidity}%
- Wind: ${appContext.liveWeather.wind_speed} km/h
- Precipitation: ${appContext.liveWeather.precipitation} mm
- Weather Code: ${appContext.liveWeather.weather_code}` : ""}

🚨 UNREAD ALERTS (${alerts.length}):
${alerts.length > 0 ? alerts.slice(0, 5).map((a: any) => `- [${a.severity}] ${a.title}: ${a.message}`).join("\n") : "- All clear!"}

🗺️ FARM PLOTS (${plots.length}):
${plots.length > 0 ? plots.map((p: any) => `- ${p.name}: ${p.area_sqm ? `${(p.area_sqm / 4047).toFixed(2)} acres` : "Unknown area"} | ${p.description || "No description"}`).join("\n") : "- No farm plots mapped"}

📦 STORAGE REQUESTS (${storageReqs.length}):
${storageReqs.length > 0 ? storageReqs.map((r: any) => `- ${r.crop_type}: ${r.quantity_kg}kg | Harvest: ${r.harvest_date} | Status: ${r.status} | Score: ${r.suitability_score ?? "Pending"}`).join("\n") : "- No storage requests"}

📱 DEVICE INFO:
- User Agent: ${appContext?.userAgent || "Unknown"}
- Screen: ${appContext?.screenSize || "Unknown"}
- Online: ${appContext?.isOnline !== false ? "Yes" : "Offline"}
- Current Page: ${appContext?.currentPage || "Unknown"}
`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, appContext } = await req.json();
    const ai = getAIConfig();

    // Try to get authenticated user context
    let userContext = "";
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
        
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        });

        // Use getClaims for reliable JWT verification with signing-keys
        const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
        
        if (claimsError || !claimsData?.claims?.sub) {
          // Fallback to getUser if getClaims not available
          console.warn("getClaims failed, trying getUser:", claimsError?.message);
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (user && !userError) {
            console.log("User authenticated via getUser:", user.id);
            userContext = await gatherUserContext(supabase, user.id, appContext);
          } else {
            console.warn("Could not get user:", userError?.message);
          }
        } else {
          const userId = claimsData.claims.sub as string;
          console.log("User authenticated via getClaims:", userId);
          userContext = await gatherUserContext(supabase, userId, appContext);
          console.log("User context length:", userContext.length, "chars");
          console.log("Context preview:", userContext.substring(0, 500));
        }
      } catch (e) {
        console.warn("Could not fetch user context:", e);
      }
    } else {
      console.warn("No authorization header found");
    }

    const systemPrompt = `You are "Sprout 🌱", a friendly, knowledgeable farming assistant for the AgroEye app.

YOU HAVE FULL ACCESS TO THE USER'S FARM DATA. Use it to give personalized, specific advice.

${userContext ? userContext : "No user data available - give general farming advice."}

CRITICAL RULES — STRICTLY FOLLOW:
1. ONLY reference data that exists in the context above. NEVER invent, assume, or hallucinate data.
2. If the user asks about a crop they haven't added (not in ACTIVE CROPS list), say: "I don't see that crop in your farm. You can add it from the Crops page! 🌱"
3. If a data section says "No data", "No active crops", "None", or similar — say exactly that. Do NOT make up values.
4. If moisture/fertility/weather shows "No data" — say "I don't have that data yet. Add a reading or connect a sensor to get started!"
5. NEVER guess sensor readings, moisture levels, temperatures, crop health scores, or any numeric values.
6. If live weather is available, use it. If not, say you don't have weather info.
7. Reference crops, sensors, and pumps by their EXACT names from the data above.
8. Speak in the user's language preference (${appContext?.language || "en"}) when possible.
9. Keep responses SHORT (2-4 sentences) but DATA-DRIVEN.
10. Use emojis to make it friendly (💧🌱☀️🐛).
11. Give ONE clear action step based on their actual data.
12. You can help with: moisture, crops, sensors, pumps, pest detection, schedules, weather, fertility, farm mapping, storage, and yield prediction.
13. Never reveal raw database details or IDs.
14. If they ask about something not in their data, suggest they set it up in the app.`;

    const response = await fetch(ai.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ai.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ai.model,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many messages. Wait a minute and try again!" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service busy. Try again later!" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Something went wrong" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
