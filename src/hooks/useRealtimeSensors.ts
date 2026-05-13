import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SensorReading {
  id: string;
  sensor_code: string;
  sensor_name: string;
  sensor_type: string | null;
  last_reading: number | null;
  last_reading_at: string | null;
  is_active: boolean;
  latitude: number | null;
  longitude: number | null;
}

export interface RealtimeSensorData {
  moisture: number | null;
  fertility: number | null;
  temperature: number | null;
  humidity: number | null;
  sensors: SensorReading[];
  loading: boolean;
}

export const useRealtimeSensors = () => {
  const [data, setData] = useState<RealtimeSensorData>({
    moisture: null,
    fertility: null,
    temperature: null,
    humidity: null,
    sensors: [],
    loading: true,
  });

  const fetchSensors = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: sensors } = await supabase
      .from("sensors")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("last_reading_at", { ascending: false });

    const sensorList: SensorReading[] = (sensors || []).map((s: any) => ({
      id: s.id,
      sensor_code: s.sensor_code,
      sensor_name: s.sensor_name,
      sensor_type: s.sensor_type ?? "moisture",
      last_reading: s.last_reading,
      last_reading_at: s.last_reading_at,
      is_active: s.is_active,
      latitude: s.latitude,
      longitude: s.longitude,
    }));

    // Get latest moisture reading
    const { data: moistureData } = await supabase
      .from("moisture_readings")
      .select("moisture_level")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Get latest fertility reading
    const { data: fertilityData } = await supabase
      .from("fertility_readings")
      .select("overall_fertility")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    setData({
      moisture: moistureData?.moisture_level ?? null,
      fertility: fertilityData?.overall_fertility ?? null,
      temperature: null, // From weather API
      humidity: null,
      sensors: sensorList,
      loading: false,
    });
  };

  useEffect(() => {
    fetchSensors();

    const sensorsChannel = supabase
      .channel("realtime-sensors")
      .on("postgres_changes", { event: "*", schema: "public", table: "sensors" }, () => fetchSensors())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "moisture_readings" }, () => fetchSensors())
      .subscribe();

    return () => {
      supabase.removeChannel(sensorsChannel);
    };
  }, []);

  return data;
};
