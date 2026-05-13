import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface HealthScoreData {
  created_at: string;
  overall_score: number;
}

const HealthScoreChart = ({ cropId }: { cropId?: string | null }) => {
  const [scores, setScores] = useState<HealthScoreData[]>([]);
  const [period, setPeriod] = useState<7 | 30 | 90>(30);

  useEffect(() => {
    fetchScores();
  }, [cropId, period]);

  const fetchScores = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - period);

    const query = supabase
      .from("health_scores")
      .select("created_at, overall_score")
      .eq("user_id", user.id)
      .gte("created_at", cutoff.toISOString())
      .order("created_at", { ascending: true });

    if (cropId) query.eq("crop_id", cropId);

    const { data } = await query;
    setScores(data || []);
  };

  const chartData = scores.map(score => ({
    date: new Date(score.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: score.overall_score,
  }));

  const chartConfig = {
    score: {
      label: "Health Score",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Health Score Trends</CardTitle>
          <div className="flex gap-1">
            <Button
              variant={period === 7 ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(7)}
            >
              7D
            </Button>
            <Button
              variant={period === 30 ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(30)}
            >
              30D
            </Button>
            <Button
              variant={period === 90 ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(90)}
            >
              90D
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-hidden">
        {chartData.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No health score data for the selected period
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  domain={[0, 100]}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default HealthScoreChart;
