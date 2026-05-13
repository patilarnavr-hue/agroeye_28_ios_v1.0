import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplet } from "lucide-react";

interface MoistureGaugeProps {
  value: number | null;
  label?: string;
}

const MoistureGauge = ({ value, label = "Soil Moisture" }: MoistureGaugeProps) => {
  const level = value ?? 0;
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (level / 100) * circumference;
  const color =
    level < 30 ? "hsl(var(--destructive))" : level < 60 ? "hsl(var(--accent))" : "hsl(var(--primary))";

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Droplet className="w-4 h-4" /> {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex justify-center pb-4">
        <div className="relative w-28 h-28">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="45" fill="none"
              stroke={color} strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">{value !== null ? `${level}%` : "—"}</span>
            <span className="text-[10px] text-muted-foreground">
              {level < 30 ? "Low" : level < 60 ? "Moderate" : "Optimal"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MoistureGauge;
