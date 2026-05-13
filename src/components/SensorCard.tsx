import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";
import type { SensorReading } from "@/hooks/useRealtimeSensors";

interface SensorCardProps {
  sensor: SensorReading;
}

const SensorCard = ({ sensor }: SensorCardProps) => {
  const isRecent = sensor.last_reading_at
    ? Date.now() - new Date(sensor.last_reading_at).getTime() < 3600000
    : false;

  return (
    <Card className="glass-card">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-xl ${isRecent ? "bg-primary/10" : "bg-muted"}`}>
          {isRecent ? <Wifi className="w-5 h-5 text-primary" /> : <WifiOff className="w-5 h-5 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{sensor.sensor_name}</p>
          <p className="text-xs text-muted-foreground capitalize">{sensor.sensor_type || "moisture"}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">
            {sensor.last_reading !== null ? `${sensor.last_reading}%` : "—"}
          </p>
          <Badge variant={isRecent ? "default" : "secondary"} className="text-[10px]">
            {isRecent ? "Live" : "Offline"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default SensorCard;
