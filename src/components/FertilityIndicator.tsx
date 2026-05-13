import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sprout } from "lucide-react";

interface FertilityIndicatorProps {
  value: number | null;
}

const FertilityIndicator = ({ value }: FertilityIndicatorProps) => {
  const level = value ?? 0;
  const label = level < 30 ? "Low" : level < 60 ? "Moderate" : level < 80 ? "Good" : "Excellent";
  const color = level < 30 ? "text-destructive" : level < 60 ? "text-accent" : "text-primary";

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sprout className="w-4 h-4" /> Soil Fertility
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-end justify-between">
          <span className={`text-3xl font-bold ${color}`}>
            {value !== null ? `${level}%` : "—"}
          </span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <Progress value={level} className="h-2" />
      </CardContent>
    </Card>
  );
};

export default FertilityIndicator;
