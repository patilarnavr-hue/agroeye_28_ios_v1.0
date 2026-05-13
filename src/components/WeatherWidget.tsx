import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud, Droplets, Wind, ThermometerSun, Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface WeatherData {
  temperature: number;
  humidity: number;
  condition: string;
  precipitation: number;
  windSpeed: number;
}

const WeatherWidget = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState("Detecting...");

  useEffect(() => {
    getLocationAndFetch();
  }, []);

  const getLocationAndFetch = () => {
    if (!navigator.geolocation) {
      fetchOpenMeteo(20.5937, 78.9629, "Default Location");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        fetchOpenMeteo(latitude, longitude, "Your Farm");
      },
      () => {
        fetchOpenMeteo(20.5937, 78.9629, "Default Location");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const fetchOpenMeteo = async (lat: number, lon: number, fallbackName: string) => {
    try {
      // Reverse geocode for accurate location
      let locName = fallbackName;
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=14`);
        const geoData = await geoRes.json();
        if (geoData.address) {
          locName = geoData.address.suburb || geoData.address.neighbourhood || geoData.address.town || geoData.address.city || geoData.address.village || fallbackName;
        }
      } catch {}
      setLocationName(locName);

      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code&timezone=auto`
      );
      const data = await res.json();

      const current = data.current;
      const weatherCode = current.weather_code;
      
      const conditionMap: Record<number, string> = {
        0: "Clear", 1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast",
        45: "Foggy", 48: "Foggy", 51: "Light Drizzle", 53: "Drizzle",
        55: "Heavy Drizzle", 61: "Light Rain", 63: "Rain", 65: "Heavy Rain",
        71: "Light Snow", 73: "Snow", 75: "Heavy Snow", 80: "Rain Showers",
        81: "Rain Showers", 82: "Heavy Showers", 95: "Thunderstorm",
      };

      setWeather({
        temperature: current.temperature_2m,
        humidity: current.relative_humidity_2m,
        precipitation: current.precipitation,
        windSpeed: current.wind_speed_10m,
        condition: conditionMap[weatherCode] || "Unknown",
      });
    } catch (error) {
      console.error("Weather fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDewPoint = (temp: number, humidity: number) => {
    const a = 17.27, b = 237.7;
    const gamma = (a * temp) / (b + temp) + Math.log(humidity / 100);
    return (b * gamma) / (a - gamma);
  };

  const getFrostRisk = (temp: number) => {
    if (temp <= 0) return { level: "High", color: "destructive" as const };
    if (temp <= 4) return { level: "Medium", color: "secondary" as const };
    return { level: "Low", color: "default" as const };
  };

  const getSprayCondition = (windSpeed: number, humidity: number) => {
    if (windSpeed > 15 || humidity < 40) return "Poor";
    if (windSpeed > 10 || humidity < 50) return "Fair";
    return "Good";
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Cloud className="w-4 h-4" /> Weather
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (!weather) return null;

  const dewPoint = getDewPoint(weather.temperature, weather.humidity);
  const frost = getFrostRisk(weather.temperature);
  const sprayCondition = getSprayCondition(weather.windSpeed, weather.humidity);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Cloud className="w-4 h-4" />
          Weather — {locationName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2 bg-muted/40 rounded-xl">
              <ThermometerSun className="w-4 h-4 text-accent flex-shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Temp</p>
                <p className="text-sm font-semibold">{weather.temperature.toFixed(1)}°C</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/40 rounded-xl">
              <Droplets className="w-4 h-4 text-primary flex-shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Humidity</p>
                <p className="text-sm font-semibold">{weather.humidity}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/40 rounded-xl">
              <Wind className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Wind</p>
                <p className="text-sm font-semibold">{weather.windSpeed.toFixed(1)} km/h</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/40 rounded-xl">
              <Cloud className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Rain</p>
                <p className="text-sm font-semibold">{weather.precipitation} mm</p>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-border/50 space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Farming Insights</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 bg-muted/40 rounded-xl text-center">
                <p className="text-[10px] text-muted-foreground">Dew Point</p>
                <p className="text-xs font-semibold">{dewPoint.toFixed(1)}°C</p>
              </div>
              <div className="p-2 bg-muted/40 rounded-xl text-center">
                <p className="text-[10px] text-muted-foreground">Frost</p>
                <Badge variant={frost.color} className="text-[10px] h-5">{frost.level}</Badge>
              </div>
              <div className="p-2 bg-muted/40 rounded-xl text-center">
                <p className="text-[10px] text-muted-foreground">Spray</p>
                <p className="text-xs font-semibold">{sprayCondition}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeatherWidget;
