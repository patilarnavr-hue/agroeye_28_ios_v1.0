import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface MoistureReading {
  created_at: string;
  moisture_level: number;
}

interface MoistureChartProps {
  readings: MoistureReading[];
}

const MoistureChart = ({ readings }: MoistureChartProps) => {
  const [period, setPeriod] = useState<7 | 30 | 90>(7);

  const filterByPeriod = (days: number) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return readings.filter(r => new Date(r.created_at) >= cutoff);
  };

  const chartData = filterByPeriod(period).map(reading => ({
    date: new Date(reading.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    level: reading.moisture_level,
  })).reverse();

  const chartConfig = {
    level: {
      label: "Moisture Level",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Moisture Trends</CardTitle>
          <div className="flex gap-1">
            {([7, 30, 90] as const).map((d) => (
              <Button
                key={d}
                variant={period === d ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-xs rounded-full"
                onClick={() => setPeriod(d)}
              >
                {d}D
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-3 overflow-hidden">
        {chartData.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            No data for the selected period
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[220px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  width={30}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="level"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ fill: "hsl(var(--primary))", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default MoistureChart;
