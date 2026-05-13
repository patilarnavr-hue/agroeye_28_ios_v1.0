/**
 * Widget Data Provider
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Droplet, Sprout, Sun, Clock, Cloud, ThermometerSun,
  Wind, Droplets, Bell, AlertTriangle, CheckCircle,
  Power, Timer, TrendingUp, Leaf
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface WidgetData { moisture: number | null; fertility: number | null; temperature: number | null; nextIrrigation: string | null; lastUpdated: string; }

export async function updateWidgetData(userId: string): Promise<void> {
  try {
    const { data: moistureData } = await supabase.from("moisture_readings").select("moisture_level").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).single();
    const { data: fertilityData } = await supabase.from("fertility_readings").select("overall_fertility").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).single();
    const { data: weatherData } = await supabase.from("weather_data").select("temperature").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).single();
    const { data: scheduleData } = await supabase.from("watering_schedules").select("time_of_day, title").eq("user_id", userId).eq("is_enabled", true).limit(1).single();
    const widgetData: WidgetData = { moisture: moistureData?.moisture_level ?? null, fertility: fertilityData?.overall_fertility ?? null, temperature: weatherData?.temperature ?? null, nextIrrigation: scheduleData ? `${scheduleData.title} at ${scheduleData.time_of_day}` : null, lastUpdated: new Date().toISOString() };
    localStorage.setItem("agroeye_widget_data", JSON.stringify(widgetData));
    if (window.webkit?.messageHandlers?.widgetData) window.webkit.messageHandlers.widgetData.postMessage(widgetData);
  } catch (error) { console.error("Failed to update widget data:", error); }
}

interface MiniWidgetProps { className?: string; moisture?: number | null; fertility?: number | null; sensorCount?: number; nextSchedule?: string | null; }

export function SoilHealthMiniWidget({ className, moisture, fertility, sensorCount, nextSchedule }: MiniWidgetProps) {
  const { t } = useTranslation();
  const items = [
    { icon: <Droplet className="w-4 h-4" />, label: t("widgets.moisture"), value: moisture != null ? `${moisture}%` : "—", color: moisture != null ? moisture < 30 ? "text-destructive" : "text-primary" : "text-muted-foreground" },
    { icon: <Sprout className="w-4 h-4" />, label: t("widgets.fertility"), value: fertility != null ? `${fertility}%` : "—", color: fertility != null ? fertility < 40 ? "text-destructive" : "text-primary" : "text-muted-foreground" },
    { icon: <Sun className="w-4 h-4" />, label: t("widgets.sensors"), value: sensorCount != null ? `${sensorCount}` : "—", color: sensorCount && sensorCount > 0 ? "text-amber-500" : "text-muted-foreground" },
    { icon: <Clock className="w-4 h-4" />, label: t("widgets.irrigate"), value: nextSchedule ? t("status.active") : t("status.off"), color: nextSchedule ? "text-primary" : "text-muted-foreground" },
  ];

  return (
    <Card className={cn("glass-card", className)}>
      <CardContent className="p-3">
        <div className="grid grid-cols-4 gap-2">
          {items.map((item) => (<div key={item.label} className="text-center"><div className={cn("flex justify-center mb-1", item.color)}>{item.icon}</div><p className="text-xs font-medium text-foreground">{item.value}</p><p className="text-[10px] text-muted-foreground">{item.label}</p></div>))}
        </div>
      </CardContent>
    </Card>
  );
}

export function WeatherMiniWidget({ className }: { className?: string }) {
  const { t } = useTranslation();
  const [weather, setWeather] = useState<{ temperature: number; humidity: number; condition: string; windSpeed: number; precipitation: number } | null>(null);
  const [locationName, setLocationName] = useState("...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) { fetchWeather(20.59, 78.96, "Default"); return; }
    navigator.geolocation.getCurrentPosition((p) => fetchWeather(p.coords.latitude, p.coords.longitude, "Your Farm"), () => fetchWeather(20.59, 78.96, "Default"), { timeout: 8000 });
  }, []);

  const fetchWeather = async (lat: number, lon: number, fallback: string) => {
    try {
      try { const g = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=14`); const gd = await g.json(); if (gd.address) setLocationName(gd.address.suburb || gd.address.town || gd.address.city || fallback); } catch { setLocationName(fallback); }
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code&timezone=auto`);
      const data = await res.json(); const c = data.current;
      const codes: Record<number, string> = { 0: "Clear", 1: "Clear", 2: "Cloudy", 3: "Overcast", 45: "Foggy", 48: "Foggy", 51: "Drizzle", 53: "Drizzle", 61: "Rain", 63: "Rain", 65: "Heavy Rain", 80: "Showers", 95: "Storm" };
      setWeather({ temperature: c.temperature_2m, humidity: c.relative_humidity_2m, condition: codes[c.weather_code] || "Unknown", windSpeed: c.wind_speed_10m, precipitation: c.precipitation });
    } catch {} finally { setLoading(false); }
  };

  if (loading) return (<Card className={cn("glass-card", className)}><CardContent className="p-3"><div className="flex items-center gap-2 mb-2"><Cloud className="w-4 h-4 text-muted-foreground" /><span className="text-xs font-medium text-muted-foreground">{t("widgets.weather")}</span></div><div className="space-y-1.5"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-3 w-1/2" /></div></CardContent></Card>);
  if (!weather) return null;

  return (
    <Card className={cn("glass-card", className)}><CardContent className="p-3">
      <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-1.5"><Cloud className="w-4 h-4 text-primary" /><span className="text-xs font-medium text-foreground">{locationName}</span></div><span className="text-[10px] text-muted-foreground">{weather.condition}</span></div>
      <div className="flex items-center justify-between"><div className="flex items-center gap-1"><ThermometerSun className="w-3.5 h-3.5 text-amber-500" /><span className="text-lg font-bold text-foreground">{weather.temperature.toFixed(0)}°</span></div><div className="flex gap-3 text-[10px] text-muted-foreground"><span className="flex items-center gap-0.5"><Droplets className="w-3 h-3" /> {weather.humidity}%</span><span className="flex items-center gap-0.5"><Wind className="w-3 h-3" /> {weather.windSpeed.toFixed(0)}km/h</span></div></div>
    </CardContent></Card>
  );
}

export function AlertsMiniWidget({ className }: { className?: string }) {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<{ id: string; title: string; severity: string; is_read: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAlerts(); }, []);
  const fetchAlerts = async () => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) { setLoading(false); return; }
    const { data } = await supabase.from("alerts").select("id, title, severity, is_read").eq("user_id", user.id).eq("is_read", false).order("created_at", { ascending: false }).limit(3);
    if (data) setAlerts(data); setLoading(false);
  };

  if (loading) return (<Card className={cn("glass-card", className)}><CardContent className="p-3"><Skeleton className="h-3 w-1/2 mb-2" /><Skeleton className="h-3 w-3/4" /></CardContent></Card>);

  return (
    <Card className={cn("glass-card", className)}><CardContent className="p-3">
      <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-1.5"><Bell className="w-4 h-4 text-primary" /><span className="text-xs font-medium text-foreground">{t("widgets.alerts")}</span></div>{alerts.length > 0 && <Badge variant="destructive" className="text-[10px] h-4 px-1.5">{alerts.length}</Badge>}</div>
      {alerts.length === 0 ? (<div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><CheckCircle className="w-3.5 h-3.5" />{t("widgets.allClear")}</div>) : (
        <div className="space-y-1">{alerts.map((a) => (<div key={a.id} className="flex items-center gap-1.5 text-[11px]"><AlertTriangle className={cn("w-3 h-3 shrink-0", a.severity === "high" || a.severity === "critical" ? "text-destructive" : "text-amber-500")} /><span className="text-foreground truncate">{a.title}</span></div>))}</div>
      )}
    </CardContent></Card>
  );
}

export function QuickActionsWidget({ className, onNavigate }: { className?: string; onNavigate: (path: string) => void }) {
  const { t } = useTranslation();
  const actions = [
    { icon: <Droplet className="w-4 h-4" />, label: t("widgets.moisture"), path: "/moisture", color: "hsl(200, 70%, 50%)" },
    { icon: <Leaf className="w-4 h-4" />, label: t("nav.crops"), path: "/crops", color: "hsl(142, 50%, 40%)" },
    { icon: <TrendingUp className="w-4 h-4" />, label: t("widgets.yield"), path: "/yield-prediction", color: "hsl(var(--primary))" },
    { icon: <Timer className="w-4 h-4" />, label: t("nav.schedule"), path: "/schedule", color: "hsl(270, 60%, 58%)" },
  ];

  return (
    <Card className={cn("glass-card", className)}><CardContent className="p-3">
      <div className="grid grid-cols-4 gap-2">
        {actions.map((a) => (<button key={a.label} onClick={() => onNavigate(a.path)} className="flex flex-col items-center gap-1 p-2 rounded-xl active:scale-95 transition-transform"><div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: a.color }}>{a.icon}</div><span className="text-[10px] font-medium text-foreground">{a.label}</span></button>))}
      </div>
    </CardContent></Card>
  );
}

export function CropHealthWidget({ className, cropId }: { className?: string; cropId?: string | null }) {
  const { t } = useTranslation();
  const [health, setHealth] = useState<{ overall: number; moisture: number; fertility: number } | null>(null);

  useEffect(() => { fetchHealth(); }, [cropId]);
  const fetchHealth = async () => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    const { data } = await supabase.from("health_scores").select("overall_score, moisture_score, fertility_score").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).single();
    if (data) setHealth({ overall: data.overall_score, moisture: data.moisture_score, fertility: data.fertility_score });
  };

  const score = health?.overall ?? 0;
  const color = score >= 70 ? "text-primary" : score >= 40 ? "text-amber-500" : "text-destructive";
  const label = score >= 70 ? t("status.good") : score >= 40 ? t("status.fair") : t("status.poor");

  return (
    <Card className={cn("glass-card", className)}><CardContent className="p-3">
      <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-1.5"><Leaf className="w-4 h-4 text-primary" /><span className="text-xs font-medium text-foreground">{t("widgets.cropHealth")}</span></div>{health && <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5", color)}>{label}</Badge>}</div>
      {health ? (<div className="space-y-1.5"><div className="flex items-center justify-between"><span className={cn("text-2xl font-bold", color)}>{score}%</span></div><div className="grid grid-cols-2 gap-1.5"><div className="flex justify-between items-center px-2 py-1 rounded-lg bg-muted/30"><span className="text-[10px] text-muted-foreground">{t("widgets.moisture")}</span><span className="text-[11px] font-semibold text-foreground">{health.moisture}%</span></div><div className="flex justify-between items-center px-2 py-1 rounded-lg bg-muted/30"><span className="text-[10px] text-muted-foreground">{t("widgets.fertility")}</span><span className="text-[11px] font-semibold text-foreground">{health.fertility}%</span></div></div></div>
      ) : (<p className="text-[11px] text-muted-foreground">{t("widgets.noHealthData")}</p>)}
    </CardContent></Card>
  );
}

declare global { interface Window { webkit?: { messageHandlers?: { widgetData?: { postMessage: (data: WidgetData) => void; }; }; }; } }
