/**
 * Backend Adapter - Cloud-agnostic backend layer
 * 
 * When running on Lovable Cloud / Supabase, uses edge functions.
 * When self-hosted or exported, falls back to local implementations.
 * 
 * Configuration via environment variables:
 *  - VITE_BACKEND_MODE: "cloud" | "local" (default: auto-detect)
 *  - VITE_OPENAI_API_KEY: For local AI when not using edge functions
 *  - VITE_WEATHER_API_URL: Custom weather API URL
 */

import { supabase } from "@/integrations/supabase/client";

export type BackendMode = "cloud" | "local";

// Auto-detect backend mode
export function getBackendMode(): BackendMode {
  const explicit = import.meta.env.VITE_BACKEND_MODE;
  if (explicit === "local") return "local";
  if (explicit === "cloud") return "cloud";

  // Auto-detect: if we have a Supabase project ID, assume cloud
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  if (projectId && projectId !== "YOUR_PROJECT_ID") return "cloud";

  return "local";
}

// Invoke an edge function or fall back to local
export async function invokeFunction<T>(
  functionName: string,
  body: Record<string, unknown>,
  localFallback: () => Promise<T>
): Promise<T> {
  const mode = getBackendMode();

  if (mode === "cloud") {
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body,
      });

      if (error) {
        console.warn(`Cloud function ${functionName} failed, using local fallback:`, error.message);
        return localFallback();
      }

      return data as T;
    } catch (error) {
      console.warn(`Cloud function ${functionName} unavailable, using local fallback:`, error);
      return localFallback();
    }
  }

  return localFallback();
}

// Check if cloud is available
export async function isCloudAvailable(): Promise<boolean> {
  const mode = getBackendMode();
  if (mode === "local") return false;

  try {
    // Simple ping to check connectivity
    const { error } = await supabase.from("profiles").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}
