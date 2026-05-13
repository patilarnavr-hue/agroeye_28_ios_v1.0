import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Sprout, Plus } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import FertilityChart from "@/components/FertilityChart";
import EmptyState from "@/components/EmptyState";

interface FertilityReading {
  id: string;
  nitrogen_level: number | null;
  phosphorus_level: number | null;
  potassium_level: number | null;
  overall_fertility: number | null;
  notes: string | null;
  created_at: string;
}

const Fertility = () => {
  const { t } = useTranslation();
  const [readings, setReadings] = useState<FertilityReading[]>([]);
  const [nitrogen, setNitrogen] = useState("");
  const [phosphorus, setPhosphorus] = useState("");
  const [potassium, setPotassium] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchReadings();
    const channel = supabase.channel("fertility_readings_changes").on("postgres_changes", { event: "*", schema: "public", table: "fertility_readings" }, () => fetchReadings()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchReadings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from("fertility_readings").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
    if (error) toast.error("Failed to fetch readings");
    else setReadings(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const n = parseFloat(nitrogen), p = parseFloat(phosphorus), k = parseFloat(potassium);
    const overall = ((n + p + k) / 3).toFixed(1);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("fertility_readings").insert({ user_id: user.id, nitrogen_level: n, phosphorus_level: p, potassium_level: k, overall_fertility: parseFloat(overall), notes: notes || null });
    if (error) toast.error("Failed to add reading");
    else { toast.success(t("common.success")); setNitrogen(""); setPhosphorus(""); setPotassium(""); setNotes(""); setDialogOpen(false); }
    setLoading(false);
  };

  const currentReading = readings[0];
  const overallLevel = currentReading?.overall_fertility || 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="glass-header text-primary-foreground px-6 pt-14 pb-5">
        <div className="flex items-center gap-3">
          <Sprout className="w-7 h-7" />
          <div>
            <h1 className="text-[22px] font-bold tracking-tight">{t("fertility.title")}</h1>
            <p className="text-[13px] opacity-75">{t("fertility.subtitle")}</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-lg mx-auto animate-fade-in">
        <Card className="glass-card-elevated">
          <CardContent className="pt-6 space-y-3">
            <div className="text-center">
              <div className="text-5xl font-bold text-primary">{overallLevel}%</div>
              <p className="text-[13px] text-muted-foreground mt-2">
                {overallLevel < 40 ? t("fertility.lowFertilize") : overallLevel < 70 ? t("fertility.moderate") : t("fertility.good")}
              </p>
            </div>
            <Progress value={overallLevel} className="h-2 rounded-full" />
          </CardContent>
        </Card>

        {currentReading && (
          <div className="ios-grouped-section">
            <div className="px-4 pt-3 pb-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("fertility.npk")}</h3>
            </div>
            {[
              { label: t("fertility.nitrogenShort"), value: currentReading.nitrogen_level },
              { label: t("fertility.phosphorusShort"), value: currentReading.phosphorus_level },
              { label: t("fertility.potassiumShort"), value: currentReading.potassium_level },
            ].map((item, i) => (
              <div key={item.label}>
                {i > 0 && <div className="ios-separator" />}
                <div className="ios-row py-3">
                  <div className="flex-1">
                    <span className="text-[15px] text-foreground">{item.label}</span>
                    <Progress value={item.value || 0} className="h-1.5 rounded-full mt-1.5" />
                  </div>
                  <span className="text-[15px] font-semibold text-muted-foreground">{item.value}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full rounded-2xl h-12" size="lg"><Plus className="w-5 h-5 mr-2" /> {t("fertility.addReading")}</Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl glass-card-elevated border-0">
            <DialogHeader><DialogTitle>{t("fertility.recordLevels")}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              {[
                { id: "nitrogen", label: t("fertility.nitrogenPercent"), value: nitrogen, set: setNitrogen },
                { id: "phosphorus", label: t("fertility.phosphorusPercent"), value: phosphorus, set: setPhosphorus },
                { id: "potassium", label: t("fertility.potassiumPercent"), value: potassium, set: setPotassium },
              ].map(f => (
                <div key={f.id} className="space-y-1.5">
                  <Label htmlFor={f.id} className="text-[13px] text-muted-foreground">{f.label}</Label>
                  <Input id={f.id} type="number" min="0" max="100" step="0.1" placeholder="0-100" value={f.value} onChange={(e) => f.set(e.target.value)} required className="rounded-xl h-11 glass-input" />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label className="text-[13px] text-muted-foreground">{t("common.notesOptional")}</Label>
                <Textarea placeholder={t("fertility.addObservations")} value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-xl glass-input" />
              </div>
              <Button type="submit" className="w-full rounded-xl h-11" disabled={loading}>{loading ? t("common.saving") : t("fertility.saveData")}</Button>
            </form>
          </DialogContent>
        </Dialog>

        {readings.length > 0 && <FertilityChart readings={readings} />}

        <div className="ios-grouped-section">
          <div className="px-4 pt-3 pb-1">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("fertility.recentReadings")}</h3>
          </div>
          {readings.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={Sprout} title={t("fertility.noFertilityData")} description={t("fertility.startTrackingDesc")} actionLabel={t("fertility.logFirstData")} onAction={() => setDialogOpen(true)} />
            </div>
          ) : (
            readings.map((reading, i) => (
              <div key={reading.id}>
                {i > 0 && <div className="ios-separator" />}
                <div className="ios-row py-3">
                  <div className="flex-1">
                    <span className="text-[15px] font-semibold text-foreground">{t("details.overall")}: {reading.overall_fertility}%</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">N: {reading.nitrogen_level}% · P: {reading.phosphorus_level}% · K: {reading.potassium_level}%</p>
                  </div>
                  <span className="text-[13px] text-muted-foreground">{new Date(reading.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Fertility;
