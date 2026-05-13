import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Power, Timer, Droplet, Zap, QrCode, Plus, Trash2, Wifi, WifiOff, Download, Activity, Clock, Settings2, RefreshCw, Signal } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { hapticFeedback } from "@/utils/haptics";
import { sendNotification } from "@/utils/pushNotifications";
import { calculateIrrigationDuration, PumpControlService } from "@/engine/irrigationEngine";
import { smartIrrigationService, type AutoIrrigationConfig } from "@/services/smartIrrigationService";
import { useAuthReady } from "@/hooks/useAuthReady";
import { detectDevice, getDeviceDescription, suggestPumpType } from "@/utils/deviceDetection";
import { generatePumpSketch, getApiEndpoint, type SensorProtocol } from "@/utils/sensorQR";

interface Pump { id: string; name: string; code: string; type: "submersible" | "centrifugal" | "drip" | "sprinkler"; status: "online" | "offline" | "running"; lastRun: string | null; autoMode: boolean; flowRate: number; protocol: SensorProtocol; }

const pumpService = new PumpControlService();
const PUMP_TYPES = [
  { value: "submersible", label: "Submersible Pump", icon: "💧" },
  { value: "centrifugal", label: "Centrifugal Pump", icon: "🌀" },
  { value: "drip", label: "Drip Irrigation", icon: "💦" },
  { value: "sprinkler", label: "Sprinkler System", icon: "🌧️" },
];

const PumpControl = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isReady } = useAuthReady();
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [loading, setLoading] = useState(true);
  const [moisture, setMoisture] = useState<number | null>(null);
  const [runningPumpId, setRunningPumpId] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [newPumpName, setNewPumpName] = useState("");
  const [newPumpType, setNewPumpType] = useState<string>("submersible");
  const [newPumpFlow, setNewPumpFlow] = useState("15");
  const [newPumpProtocol, setNewPumpProtocol] = useState<SensorProtocol>("wifi");

  const [autoConfig, setAutoConfig] = useState<AutoIrrigationConfig>(smartIrrigationService.getConfig());
  const [automationActive, setAutomationActive] = useState(false);

  useEffect(() => { if (!isReady || !user) return; loadData(); }, [isReady, user]);

  // Start/stop smart irrigation service based on auto pumps
  useEffect(() => {
    if (!user) return;
    const hasAutoPumps = pumps.some(p => p.autoMode);
    if (hasAutoPumps && !automationActive) {
      smartIrrigationService.start(user.id);
      setAutomationActive(true);
    }
    
    // Register all pumps with the service
    pumps.forEach(p => {
      smartIrrigationService.registerPump(p.id, p.name, p.autoMode);
    });

    // Listen for pump events
    const unsub = smartIrrigationService.subscribe((event) => {
      if (event.type === "pump_started" || event.type === "pump_stopped") {
        // Reload pump states from localStorage
        loadData();
      }
    });

    return () => {
      unsub();
    };
  }, [user, pumps.length, pumps.map(p => p.autoMode).join(",")]);

  const loadData = async () => {
    if (!user) return;
    const { data: mData } = await supabase.from("moisture_readings").select("moisture_level").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).single();
    if (mData) setMoisture(mData.moisture_level);
    const stored = localStorage.getItem(`agroeye_pumps_${user.id}`);
    if (stored) setPumps(JSON.parse(stored));
    setLoading(false);
  };

  const savePumps = useCallback((updated: Pump[]) => { setPumps(updated); if (user) localStorage.setItem(`agroeye_pumps_${user.id}`, JSON.stringify(updated)); }, [user]);

  const addPump = (code: string) => {
    if (!code.trim()) { toast.error("Enter a pump code"); return; }
    if (pumps.find(p => p.code === code)) { toast.error("Pump already paired"); return; }
    const newPump: Pump = { id: crypto.randomUUID(), name: newPumpName || `Pump ${pumps.length + 1}`, code: code.trim(), type: newPumpType as Pump["type"], status: "online", lastRun: null, autoMode: false, flowRate: parseFloat(newPumpFlow) || 15, protocol: newPumpProtocol };
    savePumps([...pumps, newPump]); hapticFeedback("success"); toast.success(`${newPump.name} paired via ${newPumpProtocol.toUpperCase()}!`);
    setShowAddSheet(false); setManualCode(""); setNewPumpName(""); setNewPumpType("submersible"); setNewPumpFlow("15"); setNewPumpProtocol("wifi");
  };

  const removePump = (id: string) => { savePumps(pumps.filter(p => p.id !== id)); hapticFeedback("light"); toast.info(t("pump.removePump")); };
  const toggleAutoMode = (id: string, checked: boolean) => { savePumps(pumps.map(p => p.id === id ? { ...p, autoMode: checked } : p)); smartIrrigationService.setPumpAutoMode(id, checked); hapticFeedback("light"); toast.info(checked ? "🤖 Auto irrigation ON — pump will react to moisture" : "Auto irrigation OFF"); };

  const runPump = async (pump: Pump) => {
    if (!user) return; hapticFeedback("medium"); setRunningPumpId(pump.id);
    const m = moisture ?? 0; const event = pumpService.createEvent(m, "manual"); const duration = event?.durationMinutes || 5;
    savePumps(pumps.map(p => p.id === pump.id ? { ...p, status: "running" as const, lastRun: new Date().toISOString() } : p));
    await (supabase as any).from("irrigation_events").insert({ user_id: user.id, trigger_type: "manual", duration_minutes: duration, moisture_before: m, status: "completed" });
    sendNotification({ title: "💧 Pump Running", body: `${pump.name} running for ${duration} min.`, category: "irrigation" });
    toast.success(`${pump.name} running for ${duration} min`);
    setTimeout(() => { setRunningPumpId(null); savePumps(pumps.map(p => p.id === pump.id ? { ...p, status: "online" as const, lastRun: new Date().toISOString() } : p)); hapticFeedback("success"); }, 3000);
  };

  const startQRScanner = async () => {
    setShowScanner(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("pump-qr-reader");
      await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, (decodedText) => {
        scanner.stop().catch(() => {}); setShowScanner(false);
        const detected = detectDevice(decodedText);
        if (detected) { setManualCode(detected.code); setNewPumpName(detected.name || ""); setNewPumpType(suggestPumpType(detected)); if (detected.specs?.flowRate) setNewPumpFlow(String(detected.specs.flowRate)); toast.success(`Detected: ${getDeviceDescription(detected)}`); }
        else { let code = decodedText; try { const parsed = JSON.parse(decodedText); code = parsed.pump_id || parsed.code || parsed.id || decodedText; } catch { if (decodedText.includes("pump=")) code = new URL(decodedText).searchParams.get("pump") || decodedText; } setManualCode(code); toast.success("QR code scanned!"); }
        setShowAddSheet(true);
      }, () => {});
    } catch { setShowScanner(false); toast.error("Camera access needed"); }
  };

  const downloadPumpSketch = (pump: Pump) => {
    const sketch = generatePumpSketch(pump.code, pump.type, pump.flowRate, getApiEndpoint(), pump.protocol || "wifi");
    const blob = new Blob([sketch], { type: "text/plain" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `agroeye_pump_${pump.protocol || "wifi"}_${pump.code}.ino`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    toast.success(t("pump.downloadSketch"));
  };

  const rec = calculateIrrigationDuration(moisture ?? 0);

  if (!isReady) return <div className="min-h-screen flex items-center justify-center bg-background"><Activity className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="glass-header text-primary-foreground px-6 pt-14 pb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1"><ArrowLeft className="w-6 h-6" /></button>
          <div className="flex-1">
            <h1 className="text-[22px] font-bold tracking-tight">{t("pump.title")}</h1>
            <p className="text-[13px] opacity-75">{t("pump.subtitle")}</p>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-4 animate-fade-in">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Droplet className="w-5 h-5 text-primary" /></div>
                <div><p className="text-sm font-semibold text-foreground">{t("pump.soilMoisture")}</p><p className="text-[10px] text-muted-foreground">{rec.message}</p></div>
              </div>
              <div className="text-right"><p className="text-2xl font-bold text-foreground">{moisture ?? "—"}%</p><Badge className={cn("text-[10px]", rec.urgency === "none" ? "bg-primary/10 text-primary" : rec.urgency === "critical" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-600")}>{rec.urgency}</Badge></div>
            </div>
            {rec.shouldIrrigate && (<div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40"><Timer className="w-4 h-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">{t("pump.recommendedDuration")}</span><span className="text-xs font-bold text-foreground ml-auto">{rec.durationMinutes} min</span></div>)}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="rounded-xl h-16 flex flex-col gap-1" onClick={startQRScanner}><QrCode className="w-5 h-5" /><span className="text-xs">{t("pump.scanQR")}</span></Button>
          <Sheet open={showAddSheet} onOpenChange={setShowAddSheet}>
            <SheetTrigger asChild><Button variant="outline" className="rounded-xl h-16 flex flex-col gap-1"><Plus className="w-5 h-5" /><span className="text-xs">{t("pump.addManually")}</span></Button></SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl">
              <SheetHeader><SheetTitle>{t("pump.pairNewPump")}</SheetTitle></SheetHeader>
              <div className="space-y-4 mt-4 pb-6">
                <div className="space-y-1"><Label className="text-xs">{t("pump.pumpCode")}</Label><Input value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder="e.g. PUMP-A1B2C3" className="rounded-xl" /></div>
                <div className="space-y-1"><Label className="text-xs">{t("pump.pumpName")}</Label><Input value={newPumpName} onChange={(e) => setNewPumpName(e.target.value)} placeholder="e.g. Field A Pump" className="rounded-xl" /></div>
                <div className="space-y-1"><Label className="text-xs">{t("pump.pumpType")}</Label><Select value={newPumpType} onValueChange={setNewPumpType}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{PUMP_TYPES.map(t => (<SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>))}</SelectContent></Select></div>
                <div className="space-y-1"><Label className="text-xs">{t("pump.flowRate")}</Label><Input type="number" value={newPumpFlow} onChange={(e) => setNewPumpFlow(e.target.value)} placeholder="15" className="rounded-xl" /></div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1"><Signal className="w-3 h-3" /> Protocol</Label>
                  <Select value={newPumpProtocol} onValueChange={(v) => setNewPumpProtocol(v as SensorProtocol)}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wifi">📶 WiFi / HTTP</SelectItem>
                      <SelectItem value="lora">📡 LoRa</SelectItem>
                      <SelectItem value="mqtt">🔗 MQTT</SelectItem>
                      <SelectItem value="bluetooth">🔵 Bluetooth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full rounded-xl" onClick={() => addPump(manualCode)}><Plus className="w-4 h-4 mr-1" /> {t("pump.pairPump")}</Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {showScanner && (<Card className="glass-card overflow-hidden"><CardContent className="p-0"><div id="pump-qr-reader" className="w-full" /><Button variant="ghost" className="w-full rounded-none" onClick={() => setShowScanner(false)}>{t("pump.cancelScan")}</Button></CardContent></Card>)}

        {loading ? (<div className="space-y-3"><Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-32 rounded-2xl" /></div>
        ) : pumps.length === 0 ? (
          <Card className="glass-card"><CardContent className="py-10 text-center"><div className="text-4xl mb-3">🔌</div><p className="font-medium text-foreground text-sm">{t("pump.noPumps")}</p><p className="text-xs text-muted-foreground mt-1">{t("pump.noPumpsDesc")}</p></CardContent></Card>
        ) : (
          <div className="space-y-3">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">{t("pump.connectedPumps")} ({pumps.length})</h2>
            {pumps.map((pump) => {
              const isRunning = runningPumpId === pump.id || pump.status === "running";
              const typeInfo = PUMP_TYPES.find(t => t.value === pump.type);
              return (
                <Card key={pump.id} className="glass-card">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center text-lg transition-all", isRunning ? "bg-primary text-primary-foreground animate-pulse" : pump.status === "online" ? "bg-primary/10" : "bg-muted")}>{typeInfo?.icon || "💧"}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-foreground truncate">{pump.name}</p>
                          <Badge className={cn("text-[9px]", pump.protocol === "lora" ? "bg-amber-500/10 text-amber-600" : pump.protocol === "mqtt" ? "bg-violet-500/10 text-violet-600" : "bg-primary/10 text-primary")}>{(pump.protocol || "wifi").toUpperCase()}</Badge>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">{pump.status === "online" || isRunning ? <Wifi className="w-3 h-3 text-primary" /> : <WifiOff className="w-3 h-3 text-muted-foreground" />}<span className="text-[10px] text-muted-foreground">{pump.code} · {pump.flowRate}L/min</span></div>
                      </div>
                      <Badge variant={isRunning ? "default" : pump.status === "online" ? "outline" : "secondary"} className="text-[10px]">{isRunning ? t("status.running") : pump.status}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" className={cn("flex-1 rounded-xl h-9 text-xs", isRunning && "animate-pulse")} disabled={isRunning} onClick={() => runPump(pump)}><Power className="w-3.5 h-3.5 mr-1" />{isRunning ? t("pump.stopPump") : t("pump.runPump")}</Button>
                      <div className="flex items-center gap-1.5 px-2"><Zap className="w-3 h-3 text-muted-foreground" /><Switch checked={pump.autoMode} onCheckedChange={(c) => toggleAutoMode(pump.id, c)} className="scale-75" /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col items-center p-2 rounded-lg bg-muted/30"><span className="text-[10px] text-muted-foreground">{t("details.type")}</span><span className="text-[11px] font-semibold text-foreground">{typeInfo?.label.split(" ")[0]}</span></div>
                      <div className="flex flex-col items-center p-2 rounded-lg bg-muted/30"><span className="text-[10px] text-muted-foreground">{t("pump.autoMode")}</span><span className="text-[11px] font-semibold text-foreground">{pump.autoMode ? "ON" : "OFF"}</span></div>
                      <div className="flex flex-col items-center p-2 rounded-lg bg-muted/30"><span className="text-[10px] text-muted-foreground">{t("pump.lastRun")}</span><span className="text-[11px] font-semibold text-foreground">{pump.lastRun ? new Date(pump.lastRun).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Never"}</span></div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" size="sm" className="flex-1 rounded-xl h-8 text-xs" onClick={() => downloadPumpSketch(pump)}><Download className="w-3 h-3 mr-1" /> {t("pump.downloadSketch")}</Button>
                      <Button variant="ghost" size="sm" className="rounded-xl h-8 text-xs text-destructive hover:text-destructive" onClick={() => removePump(pump.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Smart Automation Settings */}
        {pumps.some(p => p.autoMode) && (
          <Card className="glass-card border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" /> Smart Automation
                {automationActive && <Badge className="bg-primary/10 text-primary text-[9px]">Active</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Pumps with Auto Mode will turn ON when moisture drops below the dry threshold, and OFF when it reaches the wet threshold.
              </p>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-xs">Dry Threshold (turn ON)</Label>
                    <span className="text-xs font-bold text-destructive">{autoConfig.dryThreshold}%</span>
                  </div>
                  <Slider
                    value={[autoConfig.dryThreshold]}
                    min={10}
                    max={50}
                    step={5}
                    onValueChange={([v]) => {
                      const newConfig = { ...autoConfig, dryThreshold: v };
                      setAutoConfig(newConfig);
                      smartIrrigationService.configure(newConfig);
                    }}
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-xs">Wet Threshold (turn OFF)</Label>
                    <span className="text-xs font-bold text-primary">{autoConfig.wetThreshold}%</span>
                  </div>
                  <Slider
                    value={[autoConfig.wetThreshold]}
                    min={40}
                    max={80}
                    step={5}
                    onValueChange={([v]) => {
                      const newConfig = { ...autoConfig, wetThreshold: v };
                      setAutoConfig(newConfig);
                      smartIrrigationService.configure(newConfig);
                    }}
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-xs">Max Run Time</Label>
                    <span className="text-xs font-bold">{autoConfig.maxRunMinutes} min</span>
                  </div>
                  <Slider
                    value={[autoConfig.maxRunMinutes]}
                    min={5}
                    max={60}
                    step={5}
                    onValueChange={([v]) => {
                      const newConfig = { ...autoConfig, maxRunMinutes: v };
                      setAutoConfig(newConfig);
                      smartIrrigationService.configure(newConfig);
                    }}
                  />
                </div>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 space-y-1">
                <p className="text-[11px] text-foreground font-medium">How it works:</p>
                <p className="text-[10px] text-muted-foreground">💧 Moisture drops below {autoConfig.dryThreshold}% → Pump turns ON</p>
                <p className="text-[10px] text-muted-foreground">✅ Moisture reaches {autoConfig.wetThreshold}% → Pump turns OFF</p>
                <p className="text-[10px] text-muted-foreground">⏱️ Safety shutoff after {autoConfig.maxRunMinutes} minutes</p>
                <p className="text-[10px] text-muted-foreground">❄️ {autoConfig.cooldownMinutes} min cooldown between runs</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Settings2 className="w-4 h-4" /> Hardware Setup</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p><strong className="text-foreground">1.</strong> Connect your ESP32/Arduino to a relay module controlling your pump</p>
            <p><strong className="text-foreground">2.</strong> Print a QR code with your pump's unique ID</p>
            <p><strong className="text-foreground">3.</strong> Scan the QR code here to pair the pump</p>
            <p><strong className="text-foreground">4.</strong> Download the Arduino sketch and flash it to your board</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PumpControl;
