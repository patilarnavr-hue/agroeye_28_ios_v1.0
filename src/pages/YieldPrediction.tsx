import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, ArrowLeft, Loader2, BarChart3, Sprout } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import CropSelector from "@/components/CropSelector";
import { invokeFunction } from "@/utils/backendAdapter";
import { generateLocalYieldPrediction } from "@/utils/localAI";

interface YieldResult { estimated_yield: string; confidence: string; factors: { name: string; impact: string; status: string }[]; recommendations: string[]; timeline: string; }

const YieldPrediction = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selectedCrop, setSelectedCrop] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<YieldResult | null>(null);

  const predict = async () => {
    if (!selectedCrop) { toast.error("Select a crop first"); return; }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Please log in first"); return; }
      let latitude: number | null = null, longitude: number | null = null;
      try { const pos = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })); latitude = pos.coords.latitude; longitude = pos.coords.longitude; } catch {}
      const data = await invokeFunction<{ prediction: YieldResult }>("yield-prediction", { crop_id: selectedCrop, latitude, longitude }, async () => {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return { prediction: generateLocalYieldPrediction(null, null, null, "crop") };
        const [moistureRes, fertilityRes, cropRes] = await Promise.all([supabase.from("moisture_readings").select("moisture_level").eq("user_id", user.id).eq("crop_id", selectedCrop).order("created_at", { ascending: false }).limit(1).single(), supabase.from("fertility_readings").select("overall_fertility").eq("user_id", user.id).eq("crop_id", selectedCrop).order("created_at", { ascending: false }).limit(1).single(), supabase.from("crops").select("crop_type").eq("id", selectedCrop).single()]);
        return { prediction: generateLocalYieldPrediction(moistureRes.data?.moisture_level ?? null, fertilityRes.data?.overall_fertility ?? null, null, cropRes.data?.crop_type || "crop") };
      });
      setResult(data.prediction);
      toast.success(t("common.success"));
    } catch (err) { toast.error("Failed to generate prediction"); console.error(err); }
    finally { setLoading(false); }
  };

  const getStatusColor = (status: string) => { switch (status.toLowerCase()) { case "good": return "text-primary"; case "warning": return "text-accent"; case "critical": return "text-destructive"; default: return "text-muted-foreground"; } };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="glass-header text-primary-foreground px-6 pt-14 pb-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-primary-foreground hover:bg-primary-foreground/10 rounded-full"><ArrowLeft className="w-5 h-5" /></Button>
          <TrendingUp className="w-7 h-7" />
          <div>
            <h1 className="text-[22px] font-bold tracking-tight">{t("yield.title")}</h1>
            <p className="text-[13px] opacity-75">{t("yield.subtitle")}</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-lg mx-auto animate-fade-in">
        <Card className="glass-card-elevated">
          <CardHeader><CardTitle className="text-[15px]">Select Crop to Predict</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <CropSelector value={selectedCrop} onChange={(v) => setSelectedCrop(v || undefined)} />
            <Button className="w-full rounded-xl h-11" disabled={!selectedCrop || loading} onClick={predict}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("pest.analyzing")}</> : <><BarChart3 className="w-4 h-4 mr-2" /> Generate Prediction</>}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <>
            <Card className="glass-card-elevated border-primary/20">
              <CardContent className="pt-6 text-center space-y-2">
                <Sprout className="w-8 h-8 text-primary mx-auto" />
                <div className="text-4xl font-bold text-primary">{result.estimated_yield}</div>
                <p className="text-[13px] text-muted-foreground">{t("pest.confidence")}: {result.confidence}</p>
                <p className="text-[13px] text-muted-foreground">{result.timeline}</p>
              </CardContent>
            </Card>
            <div className="ios-grouped-section">
              <div className="px-4 pt-3 pb-1"><h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contributing Factors</h3></div>
              {result.factors.map((f, i) => (<div key={i}>{i > 0 && <div className="ios-separator" />}<div className="ios-row py-3"><div className="flex-1"><span className="text-[15px] text-foreground">{f.name}</span><p className="text-[11px] text-muted-foreground">{f.impact}</p></div><span className={`text-[13px] font-semibold ${getStatusColor(f.status)}`}>{f.status}</span></div></div>))}
            </div>
            <div className="ios-grouped-section">
              <div className="px-4 pt-3 pb-1"><h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">💡 Recommendations</h3></div>
              {result.recommendations.map((r, i) => (<div key={i}>{i > 0 && <div className="ios-separator" />}<div className="ios-row py-2.5"><span className="text-[13px] text-muted-foreground">• {r}</span></div></div>))}
            </div>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default YieldPrediction;
