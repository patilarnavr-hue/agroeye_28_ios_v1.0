import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { invokeFunction } from "@/utils/backendAdapter";
import { generateLocalRecommendations } from "@/utils/localAI";

interface Recommendation {
  priority: "high" | "medium" | "low";
  category: "watering" | "fertilization" | "monitoring" | "maintenance";
  title: string;
  description: string;
  impact: string;
}

const AIRecommendations = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      // Gather app context for the AI
      const { data: { user } } = await supabase.auth.getUser();
      let pumps: any[] = [];
      if (user) {
        try {
          const stored = localStorage.getItem(`agroeye_pumps_${user.id}`);
          if (stored) pumps = JSON.parse(stored);
        } catch {}
      }
      const appContext = {
        language: localStorage.getItem("i18nextLng") || navigator.language || "en",
        pumps,
        location: user ? undefined : undefined,
      };

      const data = await invokeFunction<{ recommendations: Recommendation[] }>(
        "ai-recommendations",
        { appContext },
        async () => {
          if (!user) return { recommendations: [] };

          const [moistureRes, fertilityRes, sensorRes] = await Promise.all([
            supabase.from("moisture_readings").select("moisture_level").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).single(),
            supabase.from("fertility_readings").select("overall_fertility").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).single(),
            supabase.from("sensors").select("id").eq("user_id", user.id).eq("is_active", true),
          ]);

          return {
            recommendations: generateLocalRecommendations(
              moistureRes.data?.moisture_level ?? null,
              fertilityRes.data?.overall_fertility ?? null,
              sensorRes.data?.length ?? 0
            ),
          };
        }
      );

      if (data?.recommendations) setRecommendations(data.recommendations);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      toast.error("Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecommendations(); }, []);

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      watering: "💧", fertilization: "🌱", monitoring: "📊", maintenance: "🔧",
    };
    return icons[category] || "📋";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-destructive/10 text-destructive border-destructive/20";
      case "medium": return "bg-accent/10 text-accent-foreground border-accent/20";
      default: return "bg-primary/10 text-primary border-primary/20";
    }
  };

  const visibleRecs = expanded ? recommendations : recommendations.slice(0, 2);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">Smart Tips</CardTitle>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full" onClick={fetchRecommendations} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {loading && (
          <div className="text-center py-4 text-muted-foreground text-xs">
            <div className="animate-pulse">Analyzing your farm...</div>
          </div>
        )}

        {!loading && recommendations.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-xs">
            <span className="text-xl">🌱</span>
            <p className="mt-1">Add readings to get tips!</p>
          </div>
        )}

        {!loading && visibleRecs.map((rec, idx) => (
          <div key={idx} className={`rounded-xl p-2.5 border ${getPriorityColor(rec.priority)}`}>
            <div className="flex items-start gap-2">
              <span className="text-base mt-0.5">{getCategoryIcon(rec.category)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-semibold text-xs">{rec.title}</p>
                  <Badge variant="outline" className="text-[9px] h-4 px-1">{rec.priority}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{rec.description}</p>
              </div>
            </div>
          </div>
        ))}

        {!loading && recommendations.length > 2 && (
          <Button variant="ghost" size="sm" className="w-full text-xs h-7" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Show less" : `Show ${recommendations.length - 2} more tips`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default AIRecommendations;
