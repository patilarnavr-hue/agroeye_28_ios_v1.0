import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Droplet, Plus, Wifi, Copy, Trash2, QrCode, Info } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import MoistureChart from "@/components/MoistureChart";
import EmptyState from "@/components/EmptyState";
import { PullToRefresh } from "@/components/PullToRefresh";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MoistureReading {
  id: string;
  moisture_level: number;
  status: string | null;
  notes: string | null;
  created_at: string;
  sensor_id?: string | null;
}

interface Sensor {
  id: string;
  sensor_code: string;
  sensor_name: string;
  last_reading: number | null;
  last_reading_at: string | null;
  is_active: boolean;
  created_at: string;
}

const Moisture = () => {
  const { t } = useTranslation();
  const [readings, setReadings] = useState<MoistureReading[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [moistureLevel, setMoistureLevel] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sensorName, setSensorName] = useState("");
  const [sensorLoading, setSensorLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [pairingGuide, setPairingGuide] = useState(false);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    Promise.all([fetchReadings(), fetchSensors()]).then(() => setLoading(false));
    const readingsChannel = supabase.channel("moisture_readings_changes").on("postgres_changes", { event: "*", schema: "public", table: "moisture_readings" }, () => fetchReadings()).subscribe();
    const sensorsChannel = supabase.channel("sensors_changes").on("postgres_changes", { event: "*", schema: "public", table: "sensors" }, () => fetchSensors()).subscribe();
    return () => { supabase.removeChannel(readingsChannel); supabase.removeChannel(sensorsChannel); stopScanner(); };
  }, []);

  const fetchReadings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("moisture_readings").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    setReadings(data || []);
  };

  const fetchSensors = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("sensors").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setSensors(data || []);
  };

  const handleAddSensor = async () => {
    if (!sensorName.trim()) { toast.error("Enter a sensor name"); return; }
    setSensorLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Please sign in"); setSensorLoading(false); return; }
    const code = "AGRO-" + Math.random().toString(36).substr(2, 9).toUpperCase();
    const { error } = await supabase.from("sensors").insert({ user_id: user.id, sensor_code: code, sensor_name: sensorName.trim(), is_active: true });
    if (error) toast.error("Failed to add sensor");
    else { toast.success(`Sensor paired! Code: ${code}`, { duration: 6000 }); setSensorName(""); fetchSensors(); }
    setSensorLoading(false);
  };

  const startScanner = async () => {
    setScanning(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader-moisture");
      scannerRef.current = scanner;
      await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 200, height: 200 } },
        async (decodedText) => {
          stopScanner();
          toast.success(`Scanned: ${decodedText}`);
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          const { error } = await supabase.from("sensors").insert({ user_id: user.id, sensor_code: decodedText.toUpperCase(), sensor_name: `Sensor ${decodedText.slice(-4)}`, is_active: true });
          if (error) toast.error("Failed to pair sensor");
          else { toast.success("Sensor paired!"); fetchSensors(); }
        }, () => {});
    } catch { toast.error("Camera not available"); setScanning(false); }
  };

  const stopScanner = () => { scannerRef.current?.stop().catch(() => {}); scannerRef.current = null; setScanning(false); };

  const handleDeleteSensor = async (sensorId: string) => {
    const { error } = await supabase.from("sensors").delete().eq("id", sensorId);
    if (error) toast.error("Failed to delete sensor");
    else { toast.success("Sensor removed"); fetchSensors(); }
  };

  const copySensorCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(t("moisture.codeCopied"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const level = parseFloat(moistureLevel);
    if (level < 0 || level > 100) { toast.error("Must be 0-100"); setSubmitting(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Please sign in to add readings"); setSubmitting(false); return; }
    const status = level < 30 ? "low" : level > 70 ? "high" : "optimal";
    const { error } = await supabase.from("moisture_readings").insert({ user_id: user.id, moisture_level: level, status, notes: notes || null });
    if (error) { console.error("Moisture insert error:", error); toast.error("Failed to add reading: " + error.message); }
    else { toast.success("Reading saved"); setMoistureLevel(""); setNotes(""); setDialogOpen(false); }
    setSubmitting(false);
  };

  const latestSensorReading = sensors.find(s => s.last_reading !== null);
  const currentLevel = latestSensorReading?.last_reading ?? readings[0]?.moisture_level ?? 0;
  const currentStatus = currentLevel < 30 ? "low" : currentLevel > 70 ? "high" : "optimal";
  const statusColor = currentLevel < 30 ? "text-destructive" : currentLevel > 70 ? "text-primary" : "text-accent";
  const dataSource = latestSensorReading ? t("moisture.fromSensor", { name: latestSensorReading.sensor_name }) : t("moisture.manualReading");

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="glass-header text-primary-foreground px-6 pt-14 pb-5">
          <div className="flex items-center gap-3"><Droplet className="w-7 h-7" /><div><h1 className="text-[22px] font-bold tracking-tight">{t("moisture.title")}</h1></div></div>
        </header>
        <main className="p-4 space-y-4 max-w-lg mx-auto"><Skeleton className="h-32 w-full rounded-2xl" /><Skeleton className="h-24 w-full rounded-2xl" /><Skeleton className="h-48 w-full rounded-2xl" /></main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="glass-header text-primary-foreground px-6 pt-14 pb-5">
        <div className="flex items-center gap-3">
          <Droplet className="w-7 h-7" />
          <div>
            <h1 className="text-[22px] font-bold tracking-tight">{t("moisture.title")}</h1>
            <p className="text-[13px] opacity-75">{t("moisture.subtitle")}</p>
          </div>
        </div>
      </header>

      <PullToRefresh onRefresh={async () => { await Promise.all([fetchReadings(), fetchSensors()]); }} className="flex-1 overflow-y-auto">
      <main className="p-4 space-y-4 max-w-lg mx-auto animate-fade-in">
        <Card className="glass-card">
          <CardContent className="pt-6 space-y-3">
            <div className="text-center">
              <div className={`text-5xl font-bold ${statusColor}`}>{currentLevel}%</div>
              <Badge variant="secondary" className="mt-2 capitalize">{currentStatus}</Badge>
              <p className="text-[10px] text-muted-foreground mt-1">{dataSource}</p>
            </div>
            <Progress value={currentLevel} className="h-2 rounded-full" />
          </CardContent>
        </Card>

        <Card className="glass-card border-primary/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Wifi className="w-4 h-4" /> {t("moisture.pairSensor")}</CardTitle>
              <TooltipProvider><Tooltip><TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-full" onClick={() => setPairingGuide(!pairingGuide)}><Info className="w-3.5 h-3.5" /></Button>
              </TooltipTrigger><TooltipContent side="left" className="max-w-[200px] text-xs">{t("tooltips.moisture")}</TooltipContent></Tooltip></TooltipProvider>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {pairingGuide && (
              <div className="bg-primary/5 rounded-xl p-3 text-xs space-y-1 border border-primary/10">
                <p className="font-semibold text-primary">{t("moisture.howToPair")}</p>
                <ol className="list-decimal pl-4 space-y-0.5 text-muted-foreground">
                  <li>{t("moisture.pairStep1")}</li>
                  <li>{t("moisture.pairStep2")}</li>
                  <li>{t("moisture.pairStep3")}</li>
                  <li>{t("moisture.pairStep4")}</li>
                </ol>
              </div>
            )}
            <div className="flex gap-2">
              <Input placeholder={t("moisture.sensorNamePlaceholder")} value={sensorName} onChange={(e) => setSensorName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddSensor()} className="flex-1 rounded-xl text-sm h-10" />
              <Button size="sm" className="rounded-xl h-10 px-3" onClick={handleAddSensor} disabled={sensorLoading}><Plus className="w-4 h-4" /></Button>
              <Button size="sm" variant="outline" className="rounded-xl h-10 px-3" onClick={scanning ? stopScanner : startScanner}><QrCode className="w-4 h-4" /></Button>
            </div>
            {scanning && (<div className="rounded-xl overflow-hidden bg-black"><div id="qr-reader-moisture" className="w-full" /></div>)}
            {sensors.length > 0 && (
              <div className="space-y-2 pt-1">
                {sensors.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-2.5 bg-muted/40 rounded-xl text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium truncate">{s.sensor_name}</span>
                        <Badge variant={s.is_active ? "default" : "secondary"} className="text-[10px] h-4">{s.is_active ? t("status.live") : t("status.off")}</Badge>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <code className="text-[10px] text-muted-foreground">{s.sensor_code}</code>
                        <button onClick={() => copySensorCode(s.sensor_code)} className="text-muted-foreground hover:text-foreground"><Copy className="w-3 h-3" /></button>
                      </div>
                      {s.last_reading !== null && (<p className="text-xs text-primary mt-0.5 font-medium">{t("moisture.reading")}: {s.last_reading}%</p>)}
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-full" onClick={() => handleDeleteSensor(s.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full rounded-xl h-11" size="lg"><Plus className="w-5 h-5 mr-2" /> {t("moisture.addManualReading")}</Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl glass-dialog border-0">
            <DialogHeader><DialogTitle>{t("moisture.recordMoisture")}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>{t("moisture.moistureLevel")}</Label>
                <Input type="number" min="0" max="100" step="0.1" placeholder="0-100" value={moistureLevel} onChange={(e) => setMoistureLevel(e.target.value)} required className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>{t("moisture.notesOptional")}</Label>
                <Textarea placeholder={t("moisture.observations")} value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-xl" />
              </div>
              <Button type="submit" className="w-full rounded-xl" disabled={submitting}>{submitting ? t("common.saving") : t("common.save")}</Button>
            </form>
          </DialogContent>
        </Dialog>

        {readings.length > 0 && <MoistureChart readings={readings} />}

        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t("moisture.recentReadings")}</CardTitle></CardHeader>
          <CardContent>
            {readings.length === 0 ? (
              <EmptyState icon={Droplet} title={t("moisture.noReadings")} description={t("moisture.noReadingsDesc")} actionLabel={t("moisture.addReading")} onAction={() => setDialogOpen(true)} />
            ) : (
              <div className="space-y-2">
                {readings.slice(0, 10).map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-2.5 bg-muted/40 rounded-xl">
                    <div>
                      <p className="font-semibold text-sm">{r.moisture_level}%</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()} {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <Badge variant="secondary" className="capitalize text-xs">{r.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      </PullToRefresh>
      <BottomNav />
    </div>
  );
};

export default Moisture;
