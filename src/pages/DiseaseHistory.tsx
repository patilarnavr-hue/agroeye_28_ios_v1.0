import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Bug, TrendingUp, Trash2, Image, Calendar, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import CropSelector from "@/components/CropSelector";
import { PageTransition } from "@/components/PageTransition";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Detection { id: string; crop_id: string | null; image_url: string | null; is_plant: boolean; disease_name: string; confidence: string | null; severity: string | null; description: string | null; treatment: string[] | null; prevention: string[] | null; created_at: string; }

const SEVERITY_COLORS: Record<string, string> = { high: "hsl(var(--destructive))", medium: "hsl(var(--accent))", low: "hsl(var(--secondary))", none: "hsl(var(--primary))" };

const DiseaseHistory = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCrop, setFilterCrop] = useState<string | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { fetchDetections(); }, [filterCrop]);

  const fetchDetections = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    let query = supabase.from("pest_detections").select("*").eq("user_id", user.id).eq("is_plant", true).order("created_at", { ascending: false });
    if (filterCrop) query = query.eq("crop_id", filterCrop);
    const { data } = await query;
    setDetections(data || []); setLoading(false);
  };

  const deleteDetection = async (id: string) => {
    const { error } = await supabase.from("pest_detections").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else { setDetections(prev => prev.filter(d => d.id !== id)); toast.success(t("common.success")); }
  };

  const trendData = useMemo(() => {
    const counts: Record<string, { name: string; count: number; severity: string }> = {};
    detections.forEach(d => { if (d.disease_name === "Healthy Plant") return; if (!counts[d.disease_name]) counts[d.disease_name] = { name: d.disease_name, count: 0, severity: d.severity || "none" }; counts[d.disease_name].count++; });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [detections]);

  const monthlyData = useMemo(() => {
    const months: Record<string, { month: string; healthy: number; diseased: number }> = {};
    detections.forEach(d => { const key = format(new Date(d.created_at), "MMM yyyy"); if (!months[key]) months[key] = { month: key, healthy: 0, diseased: 0 }; if (d.disease_name === "Healthy Plant" || d.severity?.toLowerCase() === "none") months[key].healthy++; else months[key].diseased++; });
    return Object.values(months).reverse().slice(0, 6);
  }, [detections]);

  const getSeverityBadge = (severity: string | null) => { switch (severity?.toLowerCase()) { case "high": return "destructive"; case "medium": return "default"; case "low": return "secondary"; default: return "outline"; } };
  const healthyCount = detections.filter(d => d.disease_name === "Healthy Plant" || d.severity?.toLowerCase() === "none").length;
  const diseasedCount = detections.filter(d => d.disease_name !== "Healthy Plant" && d.severity?.toLowerCase() !== "none").length;

  return (
    <PageTransition className="min-h-screen bg-background pb-24">
      <header className="glass-header text-primary-foreground px-6 pt-14 pb-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-primary-foreground hover:bg-primary-foreground/10 rounded-full"><ArrowLeft className="w-5 h-5" /></Button>
          <Bug className="w-7 h-7" />
          <div>
            <h1 className="text-[22px] font-bold tracking-tight">{t("diseaseHistory.title")}</h1>
            <p className="text-[13px] opacity-75">{detections.length} detection{detections.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-lg mx-auto animate-fade-in">
        <div className="grid grid-cols-3 gap-3">
          <Card className="glass-card"><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-foreground">{detections.length}</p><p className="text-[10px] text-muted-foreground">Total Scans</p></CardContent></Card>
          <Card className="glass-card"><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-primary">{healthyCount}</p><p className="text-[10px] text-muted-foreground">Healthy</p></CardContent></Card>
          <Card className="glass-card"><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-destructive">{diseasedCount}</p><p className="text-[10px] text-muted-foreground">Issues Found</p></CardContent></Card>
        </div>

        <Card className="glass-card"><CardContent className="p-3"><div className="flex items-center gap-2"><Filter className="w-4 h-4 text-muted-foreground shrink-0" /><CropSelector value={filterCrop} onChange={(v) => setFilterCrop(v || undefined)} />{filterCrop && (<Button variant="ghost" size="sm" className="text-xs shrink-0" onClick={() => setFilterCrop(undefined)}>Clear</Button>)}</div></CardContent></Card>

        {trendData.length > 0 && (
          <Card className="glass-card-elevated"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Most Common Issues</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={180}><BarChart data={trendData} layout="vertical" margin={{ left: 0, right: 8 }}><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} /><Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} /><Bar dataKey="count" radius={[0, 6, 6, 0]}>{trendData.map((entry, i) => (<Cell key={i} fill={SEVERITY_COLORS[entry.severity?.toLowerCase()] || "hsl(var(--primary))"} />))}</Bar></BarChart></ResponsiveContainer></CardContent></Card>
        )}

        {monthlyData.length > 1 && (
          <Card className="glass-card-elevated"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" />Monthly Trend</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={140}><BarChart data={monthlyData}><XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} /><YAxis hide /><Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} /><Bar dataKey="healthy" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} stackId="a" name="Healthy" /><Bar dataKey="diseased" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} stackId="a" name="Diseased" /></BarChart></ResponsiveContainer></CardContent></Card>
        )}

        <div className="space-y-1.5">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 pt-2">Detection Timeline</h2>
          {loading ? (<div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
          ) : detections.length === 0 ? (
            <Card className="glass-card"><CardContent className="py-8 text-center"><Bug className="w-10 h-10 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground text-sm">No detections yet</p><Button variant="outline" size="sm" className="mt-3 rounded-xl" onClick={() => navigate("/pest-detection")}>Scan a Plant</Button></CardContent></Card>
          ) : (
            <div className="space-y-2">
              {detections.map((d) => (
                <Card key={d.id} className="glass-card overflow-hidden"><CardContent className="p-0">
                  <button className="w-full p-3 text-left" onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}>
                    <div className="flex items-center gap-3">
                      {d.image_url ? <img src={d.image_url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" /> : <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0"><Image className="w-5 h-5 text-muted-foreground" /></div>}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2"><p className="text-sm font-semibold truncate text-foreground">{d.disease_name}</p>{d.severity && <Badge variant={getSeverityBadge(d.severity)} className="text-[9px] shrink-0">{d.severity}</Badge>}</div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(d.created_at), "MMM d, yyyy · h:mm a")}</p>
                        {d.confidence && <p className="text-[10px] text-muted-foreground">{t("pest.confidence")}: {d.confidence}</p>}
                      </div>
                    </div>
                  </button>
                  {expandedId === d.id && (
                    <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
                      {d.description && <p className="text-[13px] text-muted-foreground">{d.description}</p>}
                      {d.treatment && d.treatment.length > 0 && (<div><p className="text-[11px] font-semibold text-foreground mb-1">{t("pest.treatment")}</p>{d.treatment.map((t, i) => (<p key={i} className="text-[12px] text-muted-foreground">• {t}</p>))}</div>)}
                      {d.prevention && d.prevention.length > 0 && (<div><p className="text-[11px] font-semibold text-foreground mb-1">{t("pest.prevention")}</p>{d.prevention.map((p, i) => (<p key={i} className="text-[12px] text-muted-foreground">• {p}</p>))}</div>)}
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs" onClick={(e) => { e.stopPropagation(); deleteDetection(d.id); }}><Trash2 className="w-3 h-3 mr-1" /> {t("common.delete")}</Button>
                    </div>
                  )}
                </CardContent></Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </PageTransition>
  );
};

export default DiseaseHistory;
