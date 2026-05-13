import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bug, Camera, Upload, ArrowLeft, AlertTriangle, CheckCircle, Loader2, XCircle, History, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import CropSelector from "@/components/CropSelector";
import { invokeFunction } from "@/utils/backendAdapter";
import { getLocalPestDetectionResult } from "@/utils/localAI";

interface DetectionResult { is_plant?: boolean; disease_name: string; confidence: string; severity: string; description: string; treatment: string[]; prevention: string[]; }

const PestDetection = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<string | undefined>();
  const [recentCount, setRecentCount] = useState(0);

  useEffect(() => { loadRecentCount(); }, []);

  const loadRecentCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { count } = await supabase.from("pest_detections").select("*", { count: "exact", head: true }).eq("user_id", user.id);
    setRecentCount(count || 0);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    const reader = new FileReader(); reader.onload = () => { setImagePreview(reader.result as string); setResult(null); }; reader.readAsDataURL(file);
  };

  const saveDetection = async (detectionResult: DetectionResult) => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    let imageUrl: string | null = null;
    if (imagePreview) {
      const fileName = `${user.id}/${Date.now()}.jpg`; const base64Data = imagePreview.split(",")[1]; const byteArray = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const { data: uploadData } = await supabase.storage.from("crop_images").upload(fileName, byteArray, { contentType: "image/jpeg" });
      if (uploadData) { const { data: urlData } = supabase.storage.from("crop_images").getPublicUrl(fileName); imageUrl = urlData.publicUrl; }
    }
    await supabase.from("pest_detections").insert({ user_id: user.id, crop_id: selectedCrop || null, image_url: imageUrl, is_plant: detectionResult.is_plant ?? true, disease_name: detectionResult.disease_name, confidence: detectionResult.confidence, severity: detectionResult.severity, description: detectionResult.description, treatment: detectionResult.treatment, prevention: detectionResult.prevention });
    setRecentCount(prev => prev + 1);
  };

  const analyzeImage = async () => {
    if (!imagePreview) return; setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession(); if (!session) { toast.error("Please log in first"); return; }
      const data = await invokeFunction<{ result: DetectionResult }>("pest-detection", { image: imagePreview }, async () => ({ result: getLocalPestDetectionResult() }));
      const detectionResult = data.result; setResult(detectionResult); await saveDetection(detectionResult);
      if (detectionResult.is_plant === false) toast.warning(t("pest.notPlant"));
      else if (detectionResult.severity?.toLowerCase() === "none") toast.success("🌱");
      else toast.success(t("common.success"));
    } catch (err) { toast.error("Failed to analyze image."); console.error(err); }
    finally { setLoading(false); }
  };

  const getSeverityColor = (severity: string) => { switch (severity.toLowerCase()) { case "high": return "destructive"; case "medium": return "default"; case "low": return "secondary"; default: return "outline"; } };
  const isNotPlant = result && result.is_plant === false;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="glass-header text-primary-foreground px-6 pt-14 pb-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-primary-foreground hover:bg-primary-foreground/10 rounded-full"><ArrowLeft className="w-5 h-5" /></Button>
          <Bug className="w-7 h-7" />
          <div className="flex-1">
            <h1 className="text-[22px] font-bold tracking-tight">{t("pest.title")}</h1>
            <p className="text-[13px] opacity-75">{t("pest.subtitle")}</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-lg mx-auto animate-fade-in">
        <button onClick={() => navigate("/disease-history")} className="w-full flex items-center gap-3 p-3 bg-muted/40 rounded-2xl hover:bg-muted/60 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><History className="w-5 h-5 text-primary" /></div>
          <div className="flex-1 text-left"><p className="text-sm font-semibold text-foreground">{t("pest.diseaseHistory")}</p><p className="text-[11px] text-muted-foreground">{t("pest.detectionsSaved", { count: recentCount })}</p></div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        <Card className="glass-card"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground mb-2">{t("pest.tagCrop")}</p><CropSelector value={selectedCrop} onChange={(v) => setSelectedCrop(v || undefined)} /></CardContent></Card>

        <Card className="glass-card-elevated">
          <CardContent className="pt-6 space-y-4">
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />
            {imagePreview ? (
              <div className="relative"><img src={imagePreview} alt="Crop preview" className="w-full h-64 object-cover rounded-2xl" /><Button size="sm" variant="secondary" className="absolute top-2 right-2 rounded-full" onClick={() => { setImagePreview(null); setResult(null); }}>{t("pest.change")}</Button></div>
            ) : (
              <div className="border border-dashed border-muted-foreground/20 rounded-2xl p-8 text-center cursor-pointer hover:border-primary/40 transition-colors" onClick={() => fileInputRef.current?.click()}>
                <Camera className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="font-medium text-[15px]">{t("pest.takePhoto")}</p>
                <p className="text-[13px] text-muted-foreground mt-1">{t("pest.captureCloseup")}</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button className="flex-1 rounded-xl h-11" onClick={() => fileInputRef.current?.click()} variant="outline"><Upload className="w-4 h-4 mr-2" /> {t("pest.upload")}</Button>
              <Button className="flex-1 rounded-xl h-11" disabled={!imagePreview || loading} onClick={analyzeImage}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("pest.analyzing")}</> : <><Bug className="w-4 h-4 mr-2" /> {t("pest.analyze")}</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {isNotPlant && (
          <Card className="glass-card border-destructive/30">
            <CardHeader><CardTitle className="flex items-center gap-2 text-destructive text-[15px]"><XCircle className="w-5 h-5" /> {t("pest.notPlant")}</CardTitle></CardHeader>
            <CardContent className="space-y-3"><p className="text-[13px]">{result.description}</p><Button variant="outline" className="w-full rounded-xl" onClick={() => { setImagePreview(null); setResult(null); fileInputRef.current?.click(); }}><Camera className="w-4 h-4 mr-2" /> {t("pest.uploadPlantPhoto")}</Button></CardContent>
          </Card>
        )}

        {result && !isNotPlant && (
          <Card className="glass-card-elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-[15px]">{result.severity?.toLowerCase() === "none" ? <CheckCircle className="w-5 h-5 text-primary" /> : <AlertTriangle className="w-5 h-5 text-destructive" />}{t("pest.detectionResult")}</CardTitle>
                <Badge variant={getSeverityColor(result.severity)}>{result.severity}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div><h3 className="font-bold text-lg">{result.disease_name}</h3><p className="text-[13px] text-muted-foreground mt-1">{t("pest.confidence")}: {result.confidence}</p></div>
              <p className="text-[13px]">{result.description}</p>
              {["treatment", "prevention"].map(section => (
                <div key={section}>
                  <h4 className="font-semibold mb-2 text-[13px]">{section === "treatment" ? t("pest.treatment") : t("pest.prevention")}</h4>
                  <ul className="space-y-1">{(result as any)[section].map((t: string, i: number) => (<li key={i} className="text-[13px] text-muted-foreground flex gap-2"><span>•</span><span>{t}</span></li>))}</ul>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="ios-grouped-section">
          <div className="px-4 pt-3 pb-1"><h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("pest.tipsTitle")}</h3></div>
          {[t("pest.tip1"), t("pest.tip2"), t("pest.tip3"), t("pest.tip4")].map((tip, i) => (
            <div key={tip}>{i > 0 && <div className="ios-separator" />}<div className="ios-row py-2.5"><span className="text-[13px] text-muted-foreground">• {tip}</span></div></div>
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default PestDetection;
