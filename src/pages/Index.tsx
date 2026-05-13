import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Droplet, Sprout, Clock, Radio, Bug, TrendingUp, Map, Trophy, BarChart3, Loader2, Leaf, ChevronRight, Power, CloudSun, Heart, Shield, Waves } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import ChatBot from "@/components/ChatBot";
import Onboarding from "@/components/Onboarding";
import CropSelector from "@/components/CropSelector";
import { useRealtimeSensors } from "@/hooks/useRealtimeSensors";
import { useAuthReady } from "@/hooks/useAuthReady";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { PullToRefresh } from "@/components/PullToRefresh";
import { PageTransition, staggerContainer, staggerItem, headerVariants } from "@/components/PageTransition";
import { useDynamicIsland } from "@/components/DynamicIsland";
import { hapticFeedback } from "@/utils/haptics";
import { OfflineSyncBanner } from "@/components/OfflineSyncBanner";
import { SoilHealthMiniWidget, WeatherMiniWidget, AlertsMiniWidget, QuickActionsWidget, CropHealthWidget, updateWidgetData } from "@/components/WidgetData";
import IrrigationMiniWidget from "@/components/IrrigationMiniWidget";
import { startNotificationMonitor, stopNotificationMonitor } from "@/utils/pushNotifications";
import { startWidgetUpdates, stopWidgetUpdates } from "@/services/widgetService";
import { smartIrrigationService } from "@/services/smartIrrigationService";

const Index = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isReady } = useAuthReady();
  const sensorData = useRealtimeSensors();
  const dynamicIsland = useDynamicIsland();
  const [moistureLevel, setMoistureLevel] = useState<number | null>(null);
  const [fertilityLevel, setFertilityLevel] = useState<number | null>(null);
  const [nextSchedule, setNextSchedule] = useState<string | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);
  const [weatherData, setWeatherData] = useState<{ temp: number | null; humidity: number | null; condition: string; windSpeed: number | null }>({ temp: null, humidity: null, condition: "—", windSpeed: null });
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [pestRiskLevel, setPestRiskLevel] = useState<string>("low");
  const [irrigationEvents, setIrrigationEvents] = useState<number>(0);

  useEffect(() => {
    if (!isReady || !user) return;
    checkOnboarding();
    fetchDashboardData().then(() => setLoading(false));
    
    startNotificationMonitor(user.id);
    startWidgetUpdates(user.id, 60000); // Update widgets every minute
    smartIrrigationService.start(user.id); // Start auto-irrigation monitoring

    return () => {
      stopNotificationMonitor();
      stopWidgetUpdates();
    };
  }, [selectedCrop, isReady, user]);

  const checkOnboarding = async () => {
    if (!user) return;
    const { data } = await supabase.from("user_preferences").select("onboarding_completed").eq("user_id", user.id).maybeSingle();
    if (!data) setShowOnboarding(true);
  };

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    const moistureQuery = supabase.from("moisture_readings").select("moisture_level").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
    if (selectedCrop) moistureQuery.eq("crop_id", selectedCrop);
    const { data: moistureData } = await moistureQuery.single();
    if (moistureData) setMoistureLevel(moistureData.moisture_level);

    const fertilityQuery = supabase.from("fertility_readings").select("overall_fertility").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
    if (selectedCrop) fertilityQuery.eq("crop_id", selectedCrop);
    const { data: fertilityData } = await fertilityQuery.single();
    if (fertilityData) setFertilityLevel(fertilityData.overall_fertility);

    const { data: scheduleData } = await supabase.from("watering_schedules").select("time_of_day, title").eq("user_id", user.id).eq("is_enabled", true).limit(1).single();
    if (scheduleData) setNextSchedule(`${scheduleData.title} at ${scheduleData.time_of_day}`);

    // Weather data
    const { data: wd } = await supabase.from("weather_data").select("temperature, humidity, weather_condition, wind_speed").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).single();
    if (wd) setWeatherData({ temp: wd.temperature, humidity: wd.humidity, condition: wd.weather_condition || "—", windSpeed: wd.wind_speed });

    // Health score
    const { data: hs } = await supabase.from("health_scores").select("overall_score").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).single();
    if (hs) setHealthScore(hs.overall_score);

    // Pest risk from recent detections
    const { data: pests } = await supabase.from("pest_detections").select("severity").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5);
    if (pests && pests.length > 0) {
      const severities = pests.map((p: any) => p.severity);
      if (severities.includes("critical")) setPestRiskLevel("critical");
      else if (severities.includes("high")) setPestRiskLevel("high");
      else if (severities.includes("medium")) setPestRiskLevel("moderate");
      else setPestRiskLevel("low");
    }

    // Irrigation events count (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: events } = await supabase.from("irrigation_events").select("id, duration_minutes").eq("user_id", user.id).gte("created_at", weekAgo);
    if (events) setIrrigationEvents(events.length);

    updateWidgetData(user.id);
  }, [user, selectedCrop]);

  const handleRefresh = useCallback(async () => {
    hapticFeedback("medium");
    await fetchDashboardData();
    dynamicIsland.show({
      type: "success",
      title: t("home.dataRefreshed"),
      message: t("home.allReadingsUpdated"),
      duration: 2000,
    });
  }, [fetchDashboardData, dynamicIsland, t]);

  const moisture = sensorData.moisture ?? moistureLevel;
  const fertility = sensorData.fertility ?? fertilityLevel;
  const circ = 2 * Math.PI * 38;

  const moistureStatus = moisture !== null ? (moisture < 30 ? t("status.low") : moisture < 60 ? t("status.moderate") : t("status.optimal")) : t("status.noData");
  const fertilityStatus = fertility !== null ? (fertility < 40 ? t("status.poor") : fertility < 70 ? t("status.average") : t("status.rich")) : t("status.noData");
  const moistureColor = moisture !== null ? (moisture < 30 ? "hsl(var(--destructive))" : moisture < 60 ? "hsl(var(--metric-moisture))" : "hsl(var(--metric-moisture))") : "hsl(var(--metric-moisture))";
  const fertilityColor = fertility !== null ? (fertility < 40 ? "hsl(var(--destructive))" : fertility < 70 ? "hsl(var(--metric-fertility))" : "hsl(var(--metric-fertility))") : "hsl(var(--metric-fertility))";

  const stats = [
    {
      title: t("home.soilMoisture"),
      icon: <Droplet className="w-5 h-5" />,
      color: moistureColor,
      value: moisture !== null ? `${moisture}%` : "—",
      status: moistureStatus,
      ringValue: moisture,
      description: t("home.hydrationDesc"),
      details: [
        { label: t("details.current"), val: moisture !== null ? `${moisture}%` : "—" },
        { label: t("details.status"), val: moistureStatus },
        { label: t("details.trend"), val: t("status.stable") },
        { label: t("details.last24h"), val: "↑ 2%" },
      ],
    },
    {
      title: t("home.soilFertility"),
      icon: <Sprout className="w-5 h-5" />,
      color: fertilityColor,
      value: fertility !== null ? `${fertility}%` : "—",
      status: fertilityStatus,
      ringValue: fertility,
      description: t("home.nutrientDesc"),
      details: [
        { label: t("details.current"), val: fertility !== null ? `${fertility}%` : "—" },
        { label: t("details.status"), val: fertilityStatus },
        { label: t("details.npk"), val: t("status.balanced") },
        { label: t("details.ph"), val: "6.5" },
      ],
    },
    {
      title: t("home.activeSensors"),
      icon: <Radio className="w-5 h-5" />,
      color: "hsl(var(--metric-sensors))",
      value: `${sensorData.sensors.length}`,
      status: sensorData.sensors.length > 0 ? t("status.online") : t("status.noSensors"),
      ringValue: null,
      description: t("home.sensorDesc"),
      details: [
        { label: t("status.active"), val: `${sensorData.sensors.length}` },
        { label: t("details.signal"), val: t("details.strong") },
        { label: t("details.battery"), val: t("status.good") },
        { label: t("details.uptime"), val: "99%" },
      ],
    },
    {
      title: t("home.irrigation"),
      icon: <Clock className="w-5 h-5" />,
      color: "hsl(var(--metric-irrigation))",
      value: nextSchedule ? t("status.active") : t("status.off"),
      status: nextSchedule || t("status.noSchedules"),
      ringValue: null,
      description: t("home.irrigationDesc"),
      details: [
        { label: t("details.status"), val: nextSchedule ? t("status.active") : t("status.off") },
        { label: t("details.next"), val: nextSchedule ? t("details.today") : "—" },
        { label: t("details.mode"), val: t("details.auto") },
        { label: t("details.zones"), val: "3" },
      ],
    },
    {
      title: "Weather",
      icon: <CloudSun className="w-5 h-5" />,
      color: weatherData.temp !== null ? "hsl(200, 80%, 55%)" : "hsl(var(--muted))",
      value: weatherData.temp !== null ? `${Math.round(weatherData.temp)}°C` : "—",
      status: weatherData.condition,
      ringValue: weatherData.humidity,
      description: "Current conditions at your farm",
      details: [
        { label: "Temp", val: weatherData.temp !== null ? `${Math.round(weatherData.temp)}°C` : "—" },
        { label: "Humidity", val: weatherData.humidity !== null ? `${weatherData.humidity}%` : "—" },
        { label: "Wind", val: weatherData.windSpeed !== null ? `${weatherData.windSpeed} km/h` : "—" },
        { label: "Condition", val: weatherData.condition },
      ],
    },
    {
      title: "Crop Health",
      icon: <Heart className="w-5 h-5" />,
      color: healthScore !== null ? (healthScore >= 70 ? "hsl(var(--primary))" : healthScore >= 40 ? "hsl(var(--accent))" : "hsl(var(--destructive))") : "hsl(var(--muted))",
      value: healthScore !== null ? `${healthScore}%` : "—",
      status: healthScore !== null ? (healthScore >= 70 ? "Healthy" : healthScore >= 40 ? "Fair" : "Poor") : "No data",
      ringValue: healthScore,
      description: "Overall crop health index",
      details: [
        { label: "Score", val: healthScore !== null ? `${healthScore}%` : "—" },
        { label: "Status", val: healthScore !== null ? (healthScore >= 70 ? "Healthy" : healthScore >= 40 ? "Fair" : "Poor") : "—" },
        { label: "Trend", val: "↑ Improving" },
        { label: "Crops", val: `${sensorData.sensors.length > 0 ? "Monitored" : "—"}` },
      ],
    },
    {
      title: "Pest Risk",
      icon: <Shield className="w-5 h-5" />,
      color: pestRiskLevel === "critical" ? "hsl(var(--destructive))" : pestRiskLevel === "high" ? "hsl(30, 80%, 50%)" : pestRiskLevel === "moderate" ? "hsl(var(--accent))" : "hsl(var(--primary))",
      value: pestRiskLevel.charAt(0).toUpperCase() + pestRiskLevel.slice(1),
      status: pestRiskLevel === "low" ? "All clear" : `${pestRiskLevel} risk detected`,
      ringValue: pestRiskLevel === "critical" ? 95 : pestRiskLevel === "high" ? 75 : pestRiskLevel === "moderate" ? 50 : 15,
      description: "Disease & pest threat level",
      details: [
        { label: "Level", val: pestRiskLevel.charAt(0).toUpperCase() + pestRiskLevel.slice(1) },
        { label: "Threats", val: pestRiskLevel === "low" ? "None" : "Active" },
        { label: "Last Scan", val: "Recent" },
        { label: "Action", val: pestRiskLevel === "low" ? "None needed" : "Review" },
      ],
    },
    {
      title: "Water Savings",
      icon: <Waves className="w-5 h-5" />,
      color: "hsl(200, 70%, 50%)",
      value: irrigationEvents > 0 ? `${Math.round(irrigationEvents * 12)}L` : "—",
      status: irrigationEvents > 0 ? `${irrigationEvents} events this week` : "No irrigation yet",
      ringValue: irrigationEvents > 0 ? Math.min(100, irrigationEvents * 15) : null,
      description: "Smart irrigation water efficiency",
      details: [
        { label: "Events", val: `${irrigationEvents}` },
        { label: "Est. Saved", val: irrigationEvents > 0 ? `${Math.round(irrigationEvents * 12)}L` : "—" },
        { label: "Efficiency", val: irrigationEvents > 0 ? "High" : "—" },
        { label: "vs Manual", val: irrigationEvents > 0 ? "~30% less" : "—" },
      ],
    },
  ];

  const featureGroups = [
    {
      title: t("home.monitoring"),
      items: [
        { icon: <Droplet className="w-5 h-5" />, label: t("nav.moisture"), path: "/moisture", color: "hsl(200, 70%, 50%)" },
        { icon: <Sprout className="w-5 h-5" />, label: t("nav.fertility"), path: "/fertility", color: "hsl(var(--primary))" },
        { icon: <Radio className="w-5 h-5" />, label: t("home.sensors"), path: "/sensors", color: "hsl(210, 80%, 56%)" },
        { icon: <Clock className="w-5 h-5" />, label: t("nav.schedule"), path: "/schedule", color: "hsl(270, 60%, 58%)" },
      ],
    },
    {
      title: t("home.intelligence"),
      items: [
        { icon: <Bug className="w-5 h-5" />, label: t("home.pestDetection"), path: "/pest-detection", color: "hsl(30, 70%, 50%)" },
        { icon: <TrendingUp className="w-5 h-5" />, label: t("home.yieldPrediction"), path: "/yield-prediction", color: "hsl(var(--primary))" },
        { icon: <Leaf className="w-5 h-5" />, label: t("nav.crops"), path: "/crops", color: "hsl(142, 50%, 40%)" },
        { icon: <BarChart3 className="w-5 h-5" />, label: t("home.compareCrops"), path: "/crop-comparison", color: "hsl(210, 60%, 55%)" },
      ],
    },
    {
      title: t("home.tools"),
      items: [
        { icon: <Map className="w-5 h-5" />, label: t("home.farmMap"), path: "/farm-map", color: "hsl(142, 50%, 40%)" },
        { icon: <Power className="w-5 h-5" />, label: t("home.pumpControl"), path: "/pump-control", color: "hsl(200, 70%, 50%)" },
        { icon: <Trophy className="w-5 h-5" />, label: t("home.leaderboard"), path: "/leaderboard", color: "hsl(45, 90%, 50%)" },
      ],
    },
  ];

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-background pb-24 flex flex-col">
      <motion.header 
        className="glass-header text-primary-foreground px-6 pt-14 pb-5"
        variants={headerVariants}
        initial="initial"
        animate="enter"
      >
        <h1 className="text-[28px] font-bold tracking-tight">{t("app.name")}</h1>
        <p className="text-[13px] font-normal opacity-75 mt-0.5">{t("app.description")}</p>
      </motion.header>

      <OfflineSyncBanner />

      {loading ? (
        <main className="p-4 space-y-3 max-w-lg mx-auto w-full animate-fade-in">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </main>
      ) : (
        <PullToRefresh onRefresh={handleRefresh} className="flex-1 overflow-y-auto">
          <main id="main-content" className="px-4 pt-4 pb-4">
           <motion.div 
             className="max-w-lg mx-auto space-y-3"
             variants={staggerContainer}
             initial="initial"
             animate="enter"
           >
            <motion.div variants={staggerItem}>
              <SoilHealthMiniWidget
                moisture={moisture}
                fertility={fertility}
                sensorCount={sensorData.sensors.length}
                nextSchedule={nextSchedule}
              />
            </motion.div>

            <motion.div variants={staggerItem} className="grid grid-cols-2 gap-3">
              <WeatherMiniWidget />
              <AlertsMiniWidget />
            </motion.div>

            <motion.div variants={staggerItem} className="grid grid-cols-2 gap-3">
              <CropHealthWidget cropId={selectedCrop} />
              <IrrigationMiniWidget currentMoisture={moisture} cropId={selectedCrop} />
            </motion.div>

            <motion.div variants={staggerItem}>
              <QuickActionsWidget onNavigate={navigate} />
            </motion.div>
            
            <motion.div variants={staggerItem}>
              <CropSelector value={selectedCrop || undefined} onChange={setSelectedCrop} />
            </motion.div>

            <div className="space-y-3 -mx-4">
              <Carousel
                opts={{ align: "center", loop: true }}
                className="w-full px-4"
                setApi={(api) => {
                  api?.on("select", () => {
                    setActiveSlide(api.selectedScrollSnap());
                  });
                }}
              >
                <CarouselContent className="-ml-2.5">
                  {stats.map((stat) => (
                    <CarouselItem key={stat.title} className="pl-2.5 basis-[72%]">
                      <Card className="glass-card-elevated h-full rounded-2xl overflow-hidden" style={{ borderColor: stat.color, borderWidth: "1px" }}>
                        <div className="h-2 w-full" style={{ backgroundColor: stat.color }} />
                        <CardContent className="p-4 flex flex-col gap-2.5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="p-2 rounded-xl shrink-0 border"
                              style={{
                                borderColor: stat.color,
                                color: "hsl(var(--primary-foreground))",
                                backgroundColor: stat.color,
                              }}
                            >
                              {stat.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-semibold" style={{ color: stat.color }}>{stat.title}</h3>
                              <p className="text-[10px] text-muted-foreground truncate">{stat.status}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-center py-1">
                            {stat.ringValue !== null ? (
                              <div className="relative w-[72px] h-[72px]">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                  <circle cx="50" cy="50" r="38" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                                  <circle
                                    cx="50" cy="50" r="38" fill="none"
                                    stroke={stat.color} strokeWidth="6"
                                    strokeDasharray={circ}
                                    strokeDashoffset={circ - ((stat.ringValue ?? 0) / 100) * circ}
                                    strokeLinecap="round"
                                    className="transition-all duration-700"
                                  />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-base font-bold" style={{ color: stat.color }}>{stat.value}</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-2xl font-bold py-3" style={{ color: stat.color }}>{stat.value}</span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-1.5">
                            {stat.details.map((d) => (
                              <div key={d.label} className="flex justify-between items-center px-2.5 py-1.5 rounded-lg bg-muted/30 border-l-2" style={{ borderLeftColor: stat.color }}>
                                <span className="text-[10px] text-muted-foreground">{d.label}</span>
                                <span className="text-[11px] font-semibold text-foreground">{d.val}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>

              <div className="flex justify-center gap-1.5 px-4">
                {stats.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === activeSlide ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            </div>

            {featureGroups.map((group, gi) => (
              <motion.div 
                key={group.title} 
                className="space-y-1.5"
                variants={staggerItem}
              >
                <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 pt-2">
                  {group.title}
                </h2>
                <div className="ios-grouped-section">
                  {group.items.map((item, i) => (
                    <div key={item.label}>
                      {i > 0 && <div className="ios-separator" />}
                      <motion.button
                        onClick={() => {
                          hapticFeedback("light");
                          navigate(item.path);
                        }}
                        className="ios-row w-full"
                        whileTap={{ scale: 0.98, backgroundColor: "hsl(var(--muted) / 0.3)" }}
                        transition={{ type: "spring", damping: 20, stiffness: 400 }}
                      >
                        <div
                          className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-white"
                          style={{ backgroundColor: item.color }}
                        >
                          {item.icon}
                        </div>
                        <span className="text-[15px] font-normal text-foreground flex-1 text-left">
                          {item.label}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                      </motion.button>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
          </main>
        </PullToRefresh>
      )}

      <BottomNav />
      <ChatBot />
      <Onboarding open={showOnboarding} onComplete={() => setShowOnboarding(false)} />
    </PageTransition>
  );
};

export default Index;
