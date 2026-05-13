import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Map, Trash2, ArrowLeft, Layers, MapPin, LocateFixed, Cloud, Droplets, ThermometerSun, Wind } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

interface FarmlandPlot {
  id: string;
  name: string;
  coordinates: number[][];
  color?: string;
  area_sqm?: number;
  description?: string;
}

interface MapMarker {
  id: string;
  plot_id: string | null;
  marker_type: string;
  label: string;
  latitude: number;
  longitude: number;
}

interface SensorLocation {
  id: string;
  sensor_name: string;
  last_reading: number | null;
  latitude: number | null;
  longitude: number | null;
}

interface LocationWeather {
  temperature: number;
  humidity: number;
  condition: string;
  precipitation: number;
  windSpeed: number;
  locationName: string;
}

const FarmMap = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const mountedRef = useRef(true);

  const [plots, setPlots] = useState<FarmlandPlot[]>([]);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [sensors, setSensors] = useState<SensorLocation[]>([]);
  const [markerDialogOpen, setMarkerDialogOpen] = useState(false);
  const [markerLabel, setMarkerLabel] = useState("");
  const [markerType, setMarkerType] = useState("sensor");
  const [pendingMarkerLatLng, setPendingMarkerLatLng] = useState<[number, number] | null>(null);
  const [addingMarker, setAddingMarker] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [weather, setWeather] = useState<LocationWeather | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const loadMap = async () => {
      if (!mapRef.current || leafletMap.current) return;
      
      try {
        const L = await import("leaflet");
        
        if (!isMounted || !mapRef.current) return;

        // Fix default icons
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        });

        const map = L.map(mapRef.current, { 
          center: [20.5937, 78.9629], 
          zoom: 5, 
          zoomControl: false 
        });

        L.control.zoom({ position: "bottomright" }).addTo(map);

        // Satellite imagery
        L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
          attribution: "Tiles © Esri", 
          maxZoom: 19,
        }).addTo(map);

        // Hybrid labels
        L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
          maxZoom: 19,
        }).addTo(map);

        // Create markers layer group
        markersLayerRef.current = L.layerGroup().addTo(map);

        // Click handler for adding markers
        map.on("click", (e: any) => {
          if (addingMarker) {
            setPendingMarkerLatLng([e.latlng.lat, e.latlng.lng]);
            setMarkerDialogOpen(true);
            setAddingMarker(false);
          }
        });

        leafletMap.current = map;
        setMapReady(true);

        // Force resize after render
        setTimeout(() => {
          if (leafletMap.current) {
            leafletMap.current.invalidateSize();
          }
        }, 100);

        // Auto-locate
        locateUser();
      } catch (err) {
        console.error("Map init error:", err);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(loadMap, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  // Update markers when data changes
  useEffect(() => {
    if (!mapReady || !leafletMap.current || !markersLayerRef.current) return;
    
    const updateMarkers = async () => {
      const L = await import("leaflet");
      
      // Clear existing markers
      markersLayerRef.current.clearLayers();

      // Add plot polygons
      plots.forEach((plot) => {
        if (plot.coordinates && plot.coordinates.length > 0) {
          const polygon = L.polygon(
            plot.coordinates.map((c) => [c[0], c[1]] as [number, number]),
            { color: plot.color || "#22c55e", weight: 3, fillOpacity: 0.3 }
          );
          polygon.bindPopup(`<strong>${plot.name}</strong>${plot.area_sqm ? `<br>${(plot.area_sqm / 10000).toFixed(2)} ha` : ""}`);
          markersLayerRef.current.addLayer(polygon);
        }
      });

      // Add map markers
      markers.forEach((marker) => {
        const m = L.marker([marker.latitude, marker.longitude]);
        m.bindPopup(marker.label);
        markersLayerRef.current.addLayer(m);
      });

      // Add sensors
      sensors.filter(s => s.latitude && s.longitude).forEach((sensor) => {
        const sensorIcon = L.divIcon({
          className: 'custom-sensor-marker',
          html: `<div style="background: hsl(142, 50%, 36%); color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 12px; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">📡</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const m = L.marker([sensor.latitude!, sensor.longitude!], { icon: sensorIcon });
        m.bindPopup(`<strong>${sensor.sensor_name}</strong>${sensor.last_reading !== null ? `<br>Last: ${sensor.last_reading}%` : ""}`);
        markersLayerRef.current.addLayer(m);
      });
    };

    updateMarkers();
  }, [plots, markers, sensors, mapReady]);

  const fetchWeather = async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code&timezone=auto`
      );
      const data = await res.json();
      if (!mountedRef.current) return;
      
      const conditionMap: Record<number, string> = {
        0: "Clear", 1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast",
        45: "Foggy", 48: "Foggy", 51: "Light Drizzle", 53: "Drizzle",
        55: "Heavy Drizzle", 61: "Light Rain", 63: "Rain", 65: "Heavy Rain",
        71: "Light Snow", 73: "Snow", 75: "Heavy Snow", 80: "Rain Showers",
        81: "Rain Showers", 82: "Heavy Showers", 95: "Thunderstorm",
      };
      
      const c = data.current;
      let locationName = "Your Farm";
      
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=14`);
        const geoData = await geoRes.json();
        if (geoData.address) {
          locationName = geoData.address.suburb || geoData.address.neighbourhood || geoData.address.town || geoData.address.city || geoData.address.village || "Your Farm";
        }
      } catch {}

      setWeather({
        temperature: c.temperature_2m,
        humidity: c.relative_humidity_2m,
        precipitation: c.precipitation,
        windSpeed: c.wind_speed_10m,
        condition: conditionMap[c.weather_code] || "Unknown",
        locationName,
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("weather_data").insert({
          user_id: user.id,
          location: `${lat.toFixed(4)},${lon.toFixed(4)}`,
          temperature: c.temperature_2m,
          humidity: c.relative_humidity_2m,
          precipitation: c.precipitation,
          wind_speed: c.wind_speed_10m,
          weather_condition: conditionMap[c.weather_code] || "Unknown",
        });
      }
    } catch (e) {
      console.error("Weather fetch error:", e);
    }
  };

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [plotsRes, markersRes, sensorsRes] = await Promise.all([
      supabase.from("farmland_plots").select("*").eq("user_id", user.id).order("created_at"),
      supabase.from("map_markers").select("*").eq("user_id", user.id),
      supabase.from("sensors").select("id, sensor_name, last_reading, latitude, longitude").eq("user_id", user.id).eq("is_active", true),
    ]);
    if (!mountedRef.current) return;
    setPlots((plotsRes.data as any[]) || []);
    setMarkers((markersRes.data as any[]) || []);
    setSensors((sensorsRes.data as any[]) || []);
  };

  const locateUser = async () => {
    if (!leafletMap.current || !mountedRef.current) return;
    
    setLocating(true);
    
    if (!navigator.geolocation) {
      setLocating(false);
      toast.error("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (!mountedRef.current || !leafletMap.current) return;
        
        const { latitude, longitude } = pos.coords;
        leafletMap.current.setView([latitude, longitude], 16);
        
        const L = await import("leaflet");
        
        // Add user marker
        const userIcon = L.divIcon({
          className: 'user-location-marker',
          html: `<div style="background: #3b82f6; border: 3px solid white; border-radius: 50%; width: 16px; height: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        
        L.marker([latitude, longitude], { icon: userIcon })
          .addTo(leafletMap.current)
          .bindPopup("You are here");

        fetchWeather(latitude, longitude);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        toast.error("Could not get location");
        console.error("Geolocation error:", err);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveMarker = async () => {
    if (!pendingMarkerLatLng || !markerLabel.trim()) {
      toast.error("Please enter a label");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("map_markers").insert({
      user_id: user.id,
      latitude: pendingMarkerLatLng[0],
      longitude: pendingMarkerLatLng[1],
      label: markerLabel.trim(),
      marker_type: markerType,
    });
    if (error) toast.error("Failed to save marker");
    else {
      toast.success(t("common.success"));
      setMarkerDialogOpen(false);
      setMarkerLabel("");
      setPendingMarkerLatLng(null);
      fetchData();
    }
  };

  const handleDeletePlot = async (id: string) => {
    const { error } = await supabase.from("farmland_plots").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else { toast.success(t("common.success")); fetchData(); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24">
      <header className="glass-header text-primary-foreground px-5 pt-12 pb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-primary-foreground hover:bg-primary-foreground/10 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Map className="w-6 h-6" />
        <div>
          <h1 className="text-lg font-bold tracking-tight">{t("farmMap.title")}</h1>
          <p className="text-[11px] opacity-75">{t("farmMap.subtitle")}</p>
        </div>
      </header>

      {weather && (
        <div className="mx-3 mt-2 p-3 rounded-2xl glass-card">
          <div className="flex items-center gap-2 mb-2">
            <Cloud className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold">{weather.locationName} — {weather.condition}</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div className="flex items-center gap-1.5 p-1.5 bg-muted/40 rounded-xl">
              <ThermometerSun className="w-3.5 h-3.5 text-accent flex-shrink-0" />
              <div>
                <p className="text-[9px] text-muted-foreground">{t("farmMap.temp")}</p>
                <p className="text-xs font-semibold">{weather.temperature.toFixed(1)}°C</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 bg-muted/40 rounded-xl">
              <Droplets className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <div>
                <p className="text-[9px] text-muted-foreground">{t("farmMap.humidity")}</p>
                <p className="text-xs font-semibold">{weather.humidity}%</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 bg-muted/40 rounded-xl">
              <Wind className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-[9px] text-muted-foreground">{t("farmMap.wind")}</p>
                <p className="text-xs font-semibold">{weather.windSpeed.toFixed(0)} km/h</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 bg-muted/40 rounded-xl">
              <Cloud className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-[9px] text-muted-foreground">{t("farmMap.rain")}</p>
                <p className="text-xs font-semibold">{weather.precipitation} mm</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 p-3 flex-wrap">
        <Button variant="outline" size="sm" className="rounded-full text-xs" onClick={locateUser} disabled={locating}>
          <LocateFixed className={`w-3 h-3 mr-1 ${locating ? "animate-spin" : ""}`} /> {locating ? t("farmMap.locating") : t("farmMap.myFarm")}
        </Button>
        <Button variant="outline" size="sm" className="rounded-full text-xs" onClick={() => {
          setAddingMarker(true);
          toast.info(t("farmMap.tapToPlace"));
        }}>
          <MapPin className="w-3 h-3 mr-1" /> {t("farmMap.addMarker")}
        </Button>
        <Badge variant="secondary" className="text-xs">{plots.length} {t("farmMap.plots")}</Badge>
        <Badge variant="secondary" className="text-xs">{markers.length} {t("farmMap.markers")}</Badge>
        {sensors.length > 0 && <Badge variant="default" className="text-xs">📡 {sensors.length} sensors</Badge>}
      </div>

      <div className="flex-1 mx-3 mb-3 rounded-2xl overflow-hidden border border-border/50 shadow-lg" style={{ minHeight: "55vh" }}>
        <div ref={mapRef} className="w-full h-full" style={{ minHeight: "55vh" }} />
      </div>

      {plots.length > 0 && (
        <div className="px-3 pb-3">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Layers className="w-4 h-4" />{t("farmMap.myPlots")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {plots.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2.5 bg-muted/40 rounded-xl text-sm">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    {p.area_sqm && <Badge variant="outline" className="text-[10px] mt-0.5">{(p.area_sqm / 10000).toFixed(2)} ha</Badge>}
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-full" onClick={() => handleDeletePlot(p.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Marker Dialog */}
      <Dialog open={markerDialogOpen} onOpenChange={setMarkerDialogOpen}>
        <DialogContent className="rounded-3xl glass-card-elevated border-0">
          <DialogHeader>
            <DialogTitle>{t("farmMap.addMarker")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[13px] text-muted-foreground">{t("farmMap.label")}</Label>
              <Input
                value={markerLabel}
                onChange={(e) => setMarkerLabel(e.target.value)}
                placeholder={t("farmMap.labelPlaceholder")}
                className="rounded-xl h-11"
              />
            </div>
            <Button onClick={handleSaveMarker} className="w-full rounded-xl h-11">
              {t("farmMap.saveMarker")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FarmMap;
