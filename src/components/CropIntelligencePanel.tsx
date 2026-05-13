import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Brain, ShieldAlert, TrendingUp, Bug, Wheat } from "lucide-react";
import { useCropIntelligence } from "@/hooks/useCropIntelligence";
import { Skeleton } from "@/components/ui/skeleton";

interface CropIntelligencePanelProps {
  cropId?: string | null;
}

const CropIntelligencePanel = ({ cropId }: CropIntelligencePanelProps) => {
  const { healthScore, riskIndex, yieldPrediction, pestRisk, harvestReadiness, loading } = useCropIntelligence(cropId);

  if (loading) return <Skeleton className="h-48 w-full rounded-2xl" />;

  const yieldLabels: Record<string, string> = {
    poor: "Poor", below_average: "Below Avg", average: "Average", good: "Good", excellent: "Excellent"
  };
  const pestColors: Record<string, string> = {
    low: "bg-primary/10 text-primary",
    moderate: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    critical: "bg-destructive/10 text-destructive",
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="w-4 h-4" /> Crop Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Health Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4" /> Health
          </div>
          <span className="font-bold">{healthScore}/100</span>
        </div>
        <Progress value={healthScore} className="h-2" />

        {/* Grid of metrics */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-muted/40 rounded-xl text-center">
            <ShieldAlert className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Risk</p>
            <p className="font-bold text-sm">{riskIndex}%</p>
          </div>
          <div className="p-3 bg-muted/40 rounded-xl text-center">
            <Wheat className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Yield</p>
            <p className="font-bold text-sm">{yieldLabels[yieldPrediction]}</p>
          </div>
          <div className="p-3 bg-muted/40 rounded-xl text-center">
            <Bug className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Pest Risk</p>
            <Badge className={`${pestColors[pestRisk]} text-[10px]`}>{pestRisk}</Badge>
          </div>
          <div className="p-3 bg-muted/40 rounded-xl text-center">
            <TrendingUp className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Harvest</p>
            <p className="font-bold text-sm">{harvestReadiness}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CropIntelligencePanel;
