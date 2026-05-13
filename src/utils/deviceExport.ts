/**
 * Device Export Utility
 * 
 * Exports data to the device filesystem when available (Capacitor),
 * falls back to browser download. Creates an "AgroEye" folder.
 */

import { supabase } from "@/integrations/supabase/client";

interface ExportData {
  exported_at: string;
  user: { name: string; email: string; location: string };
  moisture_readings: any[];
  fertility_readings: any[];
  watering_schedules: any[];
  crops: any[];
  sensors: any[];
  irrigation_events: any[];
  pest_detections: any[];
  health_scores: any[];
  weather_data: any[];
}

async function gatherExportData(userId: string): Promise<ExportData> {
  const [
    moistureRes, fertilityRes, schedulesRes, cropsRes,
    sensorsRes, irrigationRes, pestRes, healthRes,
    weatherRes, profileRes,
  ] = await Promise.all([
    supabase.from("moisture_readings").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("fertility_readings").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("watering_schedules").select("*").eq("user_id", userId),
    supabase.from("crops").select("*").eq("user_id", userId),
    supabase.from("sensors").select("*").eq("user_id", userId),
    supabase.from("irrigation_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("pest_detections").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("health_scores").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("weather_data").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    supabase.from("profiles").select("*").eq("id", userId).single(),
  ]);

  return {
    exported_at: new Date().toISOString(),
    user: {
      name: profileRes.data?.full_name || "",
      email: profileRes.data?.email || "",
      location: profileRes.data?.location || "",
    },
    moisture_readings: moistureRes.data || [],
    fertility_readings: fertilityRes.data || [],
    watering_schedules: schedulesRes.data || [],
    crops: cropsRes.data || [],
    sensors: sensorsRes.data || [],
    irrigation_events: irrigationRes.data || [],
    pest_detections: pestRes.data || [],
    health_scores: healthRes.data || [],
    weather_data: weatherRes.data || [],
  };
}

async function saveToCapacitorFS(filename: string, content: string): Promise<boolean> {
  try {
    // Dynamic import - only works if Capacitor Filesystem is available
    const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");

    // Try to create the AgroEye directory
    try {
      await Filesystem.mkdir({
        path: "AgroEye",
        directory: Directory.Documents,
        recursive: true,
      });
    } catch {
      // Directory may already exist
    }

    await Filesystem.writeFile({
      path: `AgroEye/${filename}`,
      data: content,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });

    return true;
  } catch {
    return false;
  }
}

function downloadBrowser(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export type ExportFormat = "json" | "csv";

function convertToCSV(data: ExportData): string {
  const sections: string[] = [];

  // Moisture readings
  if (data.moisture_readings.length > 0) {
    sections.push("# Moisture Readings");
    sections.push("Date,Moisture Level (%),Status,Notes");
    data.moisture_readings.forEach((r) => {
      sections.push(`${r.created_at},${r.moisture_level},${r.status || ""},${(r.notes || "").replace(/,/g, ";")}`);
    });
  }

  // Fertility readings
  if (data.fertility_readings.length > 0) {
    sections.push("\n# Fertility Readings");
    sections.push("Date,Overall (%),Nitrogen (%),Phosphorus (%),Potassium (%)");
    data.fertility_readings.forEach((r) => {
      sections.push(`${r.created_at},${r.overall_fertility},${r.nitrogen_level},${r.phosphorus_level},${r.potassium_level}`);
    });
  }

  // Crops
  if (data.crops.length > 0) {
    sections.push("\n# Crops");
    sections.push("Name,Type,Planting Date,Harvest Date,Active,Location");
    data.crops.forEach((c) => {
      sections.push(`${c.name},${c.crop_type},${c.planting_date || ""},${c.expected_harvest_date || ""},${c.is_active},${(c.location || "").replace(/,/g, ";")}`);
    });
  }

  // Irrigation events
  if (data.irrigation_events.length > 0) {
    sections.push("\n# Irrigation Events");
    sections.push("Date,Duration (min),Trigger,Moisture Before (%),Moisture After (%)");
    data.irrigation_events.forEach((e) => {
      sections.push(`${e.created_at},${e.duration_minutes},${e.trigger_type},${e.moisture_before ?? ""},${e.moisture_after ?? ""}`);
    });
  }

  return sections.join("\n");
}

export async function exportUserData(
  userId: string,
  format: ExportFormat = "json"
): Promise<{ success: boolean; path?: string; method: "device" | "download" }> {
  const data = await gatherExportData(userId);
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `agroeye-export-${dateStr}.${format}`;
  const content = format === "csv" ? convertToCSV(data) : JSON.stringify(data, null, 2);

  // Try Capacitor filesystem first (native app)
  const savedToDevice = await saveToCapacitorFS(filename, content);
  if (savedToDevice) {
    return { success: true, path: `Documents/AgroEye/${filename}`, method: "device" };
  }

  // Fallback to browser download
  downloadBrowser(filename, content);
  return { success: true, method: "download" };
}
