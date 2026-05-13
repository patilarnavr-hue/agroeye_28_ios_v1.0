import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent, ChartLegendContent } from "@/components/ui/chart";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface FertilityReading {
  created_at: string;
  nitrogen_level: number | null;
  phosphorus_level: number | null;
  potassium_level: number | null;
}

interface FertilityChartProps {
  readings: FertilityReading[];
}

const FertilityChart = ({ readings }: FertilityChartProps) => {
  const [period, setPeriod] = useState<7 | 30 | 90>(30);

  const filterByPeriod = (days: number) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return readings.filter(r => new Date(r.created_at) >= cutoff);
  };

  const chartData = filterByPeriod(period).map(reading => ({
    date: new Date(reading.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    nitrogen: reading.nitrogen_level || 0,
    phosphorus: reading.phosphorus_level || 0,
    potassium: reading.potassium_level || 0,
  })).reverse();

  const chartConfig = {
    nitrogen: {
      label: "Nitrogen (N)",
      color: "hsl(142, 76%, 36%)",
    },
    phosphorus: {
      label: "Phosphorus (P)",
      color: "hsl(262, 83%, 58%)",
    },
    potassium: {
      label: "Potassium (K)",
      color: "hsl(48, 96%, 53%)",
    },
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>NPK Trends</CardTitle>
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
            No data for the selected period
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
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
                <Legend content={<ChartLegendContent />} />
                <Bar dataKey="nitrogen" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="phosphorus" fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="potassium" fill="hsl(48, 96%, 53%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default FertilityChart;
