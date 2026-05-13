/**
 * Home Screen Widget Data Bridge
 * 
 * Prepares and exposes app data for native home screen widgets.
 * On Capacitor (native), writes widget data to shared storage.
 * On PWA, registers data for periodic background sync.
 */

import { supabase } from "@/integrations/supabase/client";

export interface WidgetPayload {
  timestamp: string;
  moisture: { level: number | null; status: string; trend: string };
  fertility: { level: number | null };
  weather: { temp: number | null; condition: string; humidity: number | null };
  nextSchedule: { title: string; time: string } | null;
  alerts: { count: number; critical: number };
  crops: { count: number; names: string[] };
  irrigation: { lastRun: string | null; autoMode: boolean; pumpCount: number };
}

export async function buildWidgetPayload(userId: string): Promise<WidgetPayload> {
  const [moistureRes, fertilityRes, weatherRes, scheduleRes, alertRes, cropsRes] = await Promise.all([
    supabase.from("moisture_readings").select("moisture_level, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(3),
    supabase.from("fertility_readings").select("overall_fertility").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).single(),
    supabase.from("weather_data").select("temperature, weather_condition, humidity").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).single(),
    supabase.from("watering_schedules").select("title, time_of_day").eq("user_id", userId).eq("is_enabled", true).limit(1).single(),
    supabase.from("alerts").select("id, severity").eq("user_id", userId).eq("is_read", false),
    supabase.from("crops").select("name").eq("user_id", userId).eq("is_active", true),
  ]);

  const moistureReadings = moistureRes.data || [];
  const currentMoisture = moistureReadings[0]?.moisture_level ?? null;
  const trend = moistureReadings.length >= 2
    ? (moistureReadings[0].moisture_level > moistureReadings[1].moisture_level ? "rising" : "falling")
    : "stable";

  const alerts = alertRes.data || [];
  const criticalAlerts = alerts.filter((a: any) => a.severity === "critical" || a.severity === "high").length;

  // Get pump info from localStorage
  let pumpCount = 0;
  let autoMode = false;
  let lastRun: string | null = null;
  try {
    const stored = localStorage.getItem(`agroeye_pumps_${userId}`);
    if (stored) {
      const pumps = JSON.parse(stored);
      pumpCount = pumps.length;
      autoMode = pumps.some((p: any) => p.autoMode);
      const lastRunPump = pumps.filter((p: any) => p.lastRun).sort((a: any, b: any) => new Date(b.lastRun).getTime() - new Date(a.lastRun).getTime())[0];
      lastRun = lastRunPump?.lastRun ?? null;
    }
  } catch {}

  return {
    timestamp: new Date().toISOString(),
    moisture: {
      level: currentMoisture,
      status: currentMoisture === null ? "unknown" : currentMoisture < 30 ? "dry" : currentMoisture < 60 ? "optimal" : "wet",
      trend,
    },
    fertility: { level: fertilityRes.data?.overall_fertility ?? null },
    weather: {
      temp: weatherRes.data?.temperature ?? null,
      condition: weatherRes.data?.weather_condition ?? "Unknown",
      humidity: weatherRes.data?.humidity ?? null,
    },
    nextSchedule: scheduleRes.data ? { title: scheduleRes.data.title, time: scheduleRes.data.time_of_day } : null,
    alerts: { count: alerts.length, critical: criticalAlerts },
    crops: { count: cropsRes.data?.length ?? 0, names: (cropsRes.data || []).map((c: any) => c.name).slice(0, 3) },
    irrigation: { lastRun, autoMode, pumpCount },
  };
}

/**
 * Push widget data to all available bridges:
 * 1. iOS WebKit message handler (for WidgetKit)
 * 2. Android JavascriptInterface
 * 3. localStorage (for PWA service worker)
 * 4. Capacitor UserDefaults (for native widgets)
 */
export async function pushWidgetData(userId: string): Promise<void> {
  const payload = await buildWidgetPayload(userId);
  const jsonStr = JSON.stringify(payload);

  // Always save to localStorage for service worker / PWA
  localStorage.setItem("agroeye_widget_data", jsonStr);

  // iOS WebKit bridge (WidgetKit)
  try {
    (window as any).webkit?.messageHandlers?.widgetData?.postMessage(jsonStr);
  } catch {}

  // Android bridge
  try {
    (window as any).Android?.updateWidgetData?.(jsonStr);
  } catch {}

  // Capacitor shared preferences (for native widgets)
  try {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.set({ key: "widget_data", value: jsonStr });
  } catch {}
}

/**
 * Start periodic widget data updates
 */
let widgetInterval: ReturnType<typeof setInterval> | null = null;

export function startWidgetUpdates(userId: string, intervalMs: number = 60000) {
  stopWidgetUpdates();
  // Initial push
  pushWidgetData(userId);
  // Periodic updates
  widgetInterval = setInterval(() => pushWidgetData(userId), intervalMs);
}

export function stopWidgetUpdates() {
  if (widgetInterval) {
    clearInterval(widgetInterval);
    widgetInterval = null;
  }
}
