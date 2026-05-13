import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wifi, Plus, QrCode, Trash2, Radio, ArrowLeft, Copy, MapPin, Zap, Download, ChevronRight, Loader2, Check, Signal, Router } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { PageTransition } from "@/components/PageTransition";
import { SwipeableCard } from "@/components/SwipeableCard";
import { hapticFeedback } from "@/utils/haptics";
import { parseSensorQR, generateSensorQRPayload, generateArduinoSketch, generateLoRaSketch, generateMQTTSketch, getApiEndpoint, type SensorProtocol } from "@/utils/sensorQR";
import { detectDevice, getDeviceDescription, suggestSensorType } from "@/utils/deviceDetection";
import { useDynamicIsland } from "@/components/DynamicIsland";

interface Sensor {
  id: string; sensor_code: string; sensor_name: string; sensor_type: string | null;
  last_reading: number | null; last_reading_at: string | null; is_active: boolean;
  latitude: number | null; longitude: number | null;
  protocol?: string; gateway_id?: string; mqtt_topic?: string;
}

const SENSOR_TYPES = [
  { value: "moisture", label: "Soil Moisture", icon: "💧", desc: "Capacitive soil moisture (e.g., SEN0193, Chirp!)" },
  { value: "temperature", label: "Temp & Humidity", icon: "🌡️", desc: "DHT22, SHT30, BME280" },
  { value: "npk", label: "NPK Sensor", icon: "🧪", desc: "Soil NPK (e.g., JXBS-3001-NPK)" },
  { value: "ph", label: "Soil pH", icon: "⚗️", desc: "pH sensor (e.g., SEN0169)" },
  { value: "rain", label: "Rain Gauge", icon: "🌧️", desc: "Tipping bucket rain gauge" },
  { value: "light", label: "Light/PAR", icon: "☀️", desc: "BH1750, TSL2591 lux sensor" },
  { value: "wind", label: "Anemometer", icon: "💨", desc: "Wind speed/direction sensor" },
  { value: "flow", label: "Water Flow", icon: "🚰", desc: "YF-S201 flow meter for irrigation" },
];

const PROTOCOLS: { value: SensorProtocol; label: string; icon: string; desc: string }[] = [
  { value: "wifi", label: "WiFi / HTTP", icon: "📶", desc: "ESP32/Arduino with WiFi — sends data via HTTP POST" },
  { value: "lora", label: "LoRa", icon: "📡", desc: "Long-range, low-power — via TTN/Chirpstack gateway" },
  { value: "mqtt", label: "MQTT", icon: "🔗", desc: "Lightweight messaging — via MQTT broker" },
  { value: "bluetooth", label: "Bluetooth", icon: "🔵", desc: "Short-range — pairs via phone app" },
];

const Sensors = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const dynamicIsland = useDynamicIsland();
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [sensorName, setSensorName] = useState("");
  const [sensorType, setSensorType] = useState("moisture");
  const [protocol, setProtocol] = useState<SensorProtocol>("wifi");
  const [gatewayId, setGatewayId] = useState("");
  const [mqttTopic, setMqttTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const scannerRef = useRef<any>(null);

  useEffect(() => { fetchSensors(); return () => stopScanner(); }, []);

  const fetchSensors = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("sensors").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setSensors((data as Sensor[]) || []);
  };

  const addSensor = async (code: string, name: string, type: string, proto: SensorProtocol = "wifi") => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    let lat: number | null = null, lng: number | null = null;
    try { const pos = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })); lat = pos.coords.latitude; lng = pos.coords.longitude; } catch {}
    const insertData: any = { user_id: user.id, sensor_code: code, sensor_name: name, sensor_type: type, is_active: true, latitude: lat, longitude: lng, protocol: proto };
    if (proto === "lora" && gatewayId) insertData.gateway_id = gatewayId.toUpperCase();
    if (proto === "mqtt" && mqttTopic) insertData.mqtt_topic = mqttTopic;
    const { error } = await supabase.from("sensors").insert(insertData);
    if (error) { toast.error("Failed to add sensor"); return false; }
    hapticFeedback("success");
    dynamicIsland.show({ type: "success", title: t("common.success"), message: `${name} (${code}) via ${proto.toUpperCase()}`, duration: 3000 });
    fetchSensors();
    return true;
  };

  const handleQuickAdd = async () => {
    if (!sensorName.trim()) { toast.error("Please enter a name"); return; }
    if (protocol === "lora" && !gatewayId.trim()) { toast.error("Enter the Device EUI for LoRa"); return; }
    setLoading(true);
    const code = "AGRO-" + Math.random().toString(36).substr(2, 9).toUpperCase();
    await addSensor(code, sensorName.trim(), sensorType, protocol);
    setSensorName(""); setGatewayId(""); setMqttTopic("");
    setLoading(false);
  };

  const startScanner = async () => {
    setScanning(true);
    hapticFeedback("medium");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          stopScanner();
          hapticFeedback("success");
          const detected = detectDevice(decodedText);
          if (detected && detected.deviceType === "sensor") {
            const name = detected.name || `Sensor ${detected.code.slice(-4)}`;
            const type = suggestSensorType(detected);
            const proto = (detected.specs?.protocol?.toLowerCase() as SensorProtocol) || "wifi";
            await addSensor(detected.code, name, type, proto);
          } else if (detected && detected.deviceType === "pump") {
            dynamicIsland.show({ type: "info", title: "Pump detected", message: `${detected.name} — Go to Pump Control to pair`, duration: 4000 });
          } else {
            const parsed = parseSensorQR(decodedText);
            if (parsed) { await addSensor(parsed.sensor_code, parsed.sensor_name || `Sensor ${parsed.sensor_code.slice(-4)}`, parsed.sensor_type || "moisture", parsed.protocol || "wifi"); }
            else { toast.error("QR code doesn't contain sensor info."); }
          }
        }, () => {});
    } catch { toast.error("Camera not available."); setScanning(false); }
  };

  const stopScanner = () => { scannerRef.current?.stop().catch(() => {}); scannerRef.current = null; setScanning(false); };

  const handleDelete = async (id: string) => {
    hapticFeedback("heavy");
    const { error } = await supabase.from("sensors").delete().eq("id", id);
    if (error) toast.error("Failed to remove");
    else { dynamicIsland.show({ type: "info", title: "Sensor removed", duration: 2000 }); fetchSensors(); }
  };

  const copySensorCode = (code: string) => { navigator.clipboard.writeText(code); hapticFeedback("light"); toast.success(t("common.success")); };
  const getSensorTypeInfo = (type: string | null) => SENSOR_TYPES.find(t => t.value === type) || SENSOR_TYPES[0];
  const getProtocolInfo = (proto: string | undefined) => PROTOCOLS.find(p => p.value === proto) || PROTOCOLS[0];

  const downloadSketch = (sensor: Sensor) => {
    const proto = (sensor.protocol || "wifi") as SensorProtocol;
    let sketch: string;
    if (proto === "lora") {
      sketch = generateLoRaSketch(sensor.sensor_code, sensor.sensor_type || "moisture", sensor.gateway_id || "0000000000000000");
    } else if (proto === "mqtt") {
      sketch = generateMQTTSketch(sensor.sensor_code, sensor.sensor_type || "moisture", "broker.hivemq.com", sensor.mqtt_topic || "");
    } else {
      sketch = generateArduinoSketch(sensor.sensor_code, sensor.sensor_type || "moisture", getApiEndpoint());
    }
    const blob = new Blob([sketch], { type: "text/plain" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `agroeye_${proto}_${sensor.sensor_code.toLowerCase()}.ino`; a.click(); URL.revokeObjectURL(url);
    hapticFeedback("success");
  };

  const copyQRPayload = (sensor: Sensor) => {
    const payload = generateSensorQRPayload(sensor.sensor_code, sensor.sensor_name, sensor.sensor_type || "moisture", (sensor.protocol || "wifi") as SensorProtocol);
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    hapticFeedback("light");
    toast.success(t("common.success"));
  };

  const protocolBadge = (proto: string | undefined) => {
    const p = proto || "wifi";
    const colors: Record<string, string> = {
      wifi: "bg-primary/10 text-primary",
      lora: "bg-amber-500/10 text-amber-600",
      mqtt: "bg-violet-500/10 text-violet-600",
      bluetooth: "bg-blue-500/10 text-blue-600",
    };
    return <Badge className={`text-[9px] ${colors[p] || colors.wifi}`}>{p.toUpperCase()}</Badge>;
  };

  return (
    <PageTransition className="min-h-screen bg-background pb-24">
      <header className="glass-header text-primary-foreground px-6 pt-14 pb-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-primary-foreground hover:bg-primary-foreground/10 rounded-full"><ArrowLeft className="w-5 h-5" /></Button>
          <Radio className="w-7 h-7" />
          <div>
            <h1 className="text-[22px] font-bold tracking-tight">{t("sensors.title")}</h1>
            <p className="text-[13px] opacity-75">{t("sensors.subtitle")}</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-lg mx-auto">
        <Card className="glass-card-elevated border-primary/20">
          <CardHeader className="pb-2"><CardTitle className="text-[15px]">{t("sensors.addSensor")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm">{t("sensors.sensorName")}</Label>
              <Input placeholder={t("sensors.sensorNamePlaceholder")} value={sensorName} onChange={(e) => setSensorName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()} />
            </div>
            <div>
              <Label className="text-sm">{t("sensors.sensorType")}</Label>
              <Select value={sensorType} onValueChange={setSensorType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SENSOR_TYPES.map(t => (<SelectItem key={t.value} value={t.value}><span className="flex items-center gap-2"><span>{t.icon}</span><span>{t.label}</span></span></SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm flex items-center gap-1.5"><Signal className="w-3.5 h-3.5" /> Connection Protocol</Label>
              <Select value={protocol} onValueChange={(v) => setProtocol(v as SensorProtocol)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROTOCOLS.map(p => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="flex items-center gap-2"><span>{p.icon}</span><span>{p.label}</span></span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">{PROTOCOLS.find(p => p.value === protocol)?.desc}</p>
            </div>

            {protocol === "lora" && (
              <div className="space-y-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <Label className="text-sm flex items-center gap-1.5"><Router className="w-3.5 h-3.5" /> Device EUI</Label>
                <Input placeholder="e.g. 70B3D57ED0051234" value={gatewayId} onChange={(e) => setGatewayId(e.target.value)} className="font-mono text-xs" />
                <p className="text-[10px] text-muted-foreground">The 16-character Device EUI from your LoRa device. Found on TTN/Chirpstack console.</p>
              </div>
            )}

            {protocol === "mqtt" && (
              <div className="space-y-2 p-3 rounded-xl bg-violet-500/5 border border-violet-500/20">
                <Label className="text-sm">MQTT Topic (optional)</Label>
                <Input placeholder="e.g. agroeye/my-sensor/data" value={mqttTopic} onChange={(e) => setMqttTopic(e.target.value)} className="font-mono text-xs" />
                <p className="text-[10px] text-muted-foreground">Leave blank to auto-generate. Default broker: HiveMQ Cloud (free).</p>
              </div>
            )}

            {protocol === "bluetooth" && (
              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                <p className="text-[11px] text-muted-foreground">Bluetooth sensors pair via the phone app. Add the sensor here, then use the Capacitor BLE plugin to read data directly.</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleQuickAdd} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                {loading ? t("sensors.adding") : t("sensors.addSensorBtn")}
              </Button>
              <Button variant="outline" onClick={scanning ? stopScanner : startScanner}>
                <QrCode className="w-4 h-4 mr-1" /> {scanning ? t("sensors.stop") : t("sensors.scanQR")}
              </Button>
            </div>
            {scanning && (
              <div className="rounded-xl overflow-hidden bg-black relative">
                <div id="qr-reader" className="w-full" />
                <p className="text-center text-xs text-muted-foreground py-2 bg-background">{t("sensors.pointAtQR")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-1.5">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 pt-2">{t("sensors.mySensors")} ({sensors.length})</h2>
          {sensors.length === 0 ? (
            <Card className="glass-card"><CardContent className="py-8 text-center"><Wifi className="w-10 h-10 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground text-sm">{t("sensors.noSensors")}</p></CardContent></Card>
          ) : (
            <div className="space-y-2">
              {sensors.map((sensor) => {
                const typeInfo = getSensorTypeInfo(sensor.sensor_type);
                const isRecent = sensor.last_reading_at ? Date.now() - new Date(sensor.last_reading_at).getTime() < 3600000 : false;
                return (
                  <SwipeableCard key={sensor.id} onDelete={() => handleDelete(sensor.id)} onEdit={() => { setSelectedSensor(sensor); setShowSetup(true); }}>
                    <Card className="glass-card border-0">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isRecent ? "bg-primary/10" : "bg-muted"}`}>{typeInfo.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-sm truncate">{sensor.sensor_name}</h3>
                              <Badge variant={isRecent ? "default" : "secondary"} className="text-[9px] shrink-0">{isRecent ? t("status.live") : t("status.offline")}</Badge>
                              {protocolBadge(sensor.protocol)}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <code className="text-[10px] text-muted-foreground">{sensor.sensor_code}</code>
                              <button onClick={() => copySensorCode(sensor.sensor_code)} className="text-muted-foreground hover:text-foreground"><Copy className="w-3 h-3" /></button>
                            </div>
                            {sensor.gateway_id && <p className="text-[10px] text-muted-foreground mt-0.5">EUI: {sensor.gateway_id}</p>}
                            {sensor.latitude && sensor.longitude && (<p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-2.5 h-2.5" />{sensor.latitude.toFixed(3)}, {sensor.longitude.toFixed(3)}</p>)}
                          </div>
                          <div className="text-right shrink-0">{sensor.last_reading !== null ? <p className="text-lg font-bold text-primary">{sensor.last_reading}%</p> : <p className="text-sm text-muted-foreground">—</p>}</div>
                          <button onClick={() => { setSelectedSensor(sensor); setShowSetup(true); }} className="p-1.5 text-muted-foreground"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                      </CardContent>
                    </Card>
                  </SwipeableCard>
                );
              })}
            </div>
          )}
        </div>

        {sensors.length > 0 && (
          <div className="space-y-1.5">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 pt-2">{t("sensors.quickActions")}</h2>
            <div className="ios-grouped-section">
              <button onClick={() => { if (sensors[0]) downloadSketch(sensors[0]); }} className="ios-row w-full">
                <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-primary text-primary-foreground"><Download className="w-4 h-4" /></div>
                <span className="text-[15px] font-normal text-foreground flex-1 text-left">{t("sensors.downloadSketch")}</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
              </button>
              <div className="ios-separator" />
              <button onClick={() => { if (sensors[0]) copyQRPayload(sensors[0]); }} className="ios-row w-full">
                <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-secondary text-secondary-foreground"><QrCode className="w-4 h-4" /></div>
                <span className="text-[15px] font-normal text-foreground flex-1 text-left">{t("sensors.generateQR")}</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
              </button>
            </div>
          </div>
        )}

        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-primary" />{sensors.length > 0 ? "Connected Hardware" : "Supported Hardware"}</CardTitle></CardHeader>
          <CardContent>
            {sensors.length > 0 ? (
              <div className="space-y-2">
                {sensors.map((sensor) => { const typeInfo = getSensorTypeInfo(sensor.sensor_type); const isRecent = sensor.last_reading_at ? Date.now() - new Date(sensor.last_reading_at).getTime() < 3600000 : false; return (
                  <div key={sensor.id} className="flex items-center gap-2 p-2 bg-muted/40 rounded-lg"><span className="text-lg">{typeInfo.icon}</span><div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{sensor.sensor_name}</p><p className="text-[10px] text-muted-foreground">{typeInfo.desc}</p></div>{protocolBadge(sensor.protocol)}<Badge variant={isRecent ? "default" : "secondary"} className="text-[9px]">{isRecent ? t("status.active") : "Idle"}</Badge><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(sensor.id)}><Trash2 className="w-3.5 h-3.5" /></Button></div>
                ); })}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {[{ name: "ESP32 + Capacitive Soil", popular: true, proto: "WiFi" }, { name: "Dragino LSE01", popular: true, proto: "LoRa" }, { name: "ESP32 + DHT22", popular: true, proto: "WiFi" }, { name: "ESP32 + MQTT Broker", popular: false, proto: "MQTT" }, { name: "LoRa Node + Rain", popular: false, proto: "LoRa" }, { name: "ESP32 + Flow Meter", popular: false, proto: "WiFi" }].map((hw, i) => (
                  <div key={i} className="p-2 bg-muted/40 rounded-lg text-[11px] flex items-start gap-1.5">
                    {hw.popular && <Badge variant="default" className="text-[8px] px-1 py-0 shrink-0">Popular</Badge>}
                    <span>{hw.name}</span>
                    <Badge variant="outline" className="text-[8px] px-1 py-0 ml-auto shrink-0">{hw.proto}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {showSetup && selectedSensor && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setShowSetup(false)}>
          <div className="bg-background w-full rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-1">{selectedSensor.sensor_name}</h3>
            <div className="flex items-center gap-2 mb-4">
              <code className="bg-muted px-2 py-0.5 rounded text-sm">{selectedSensor.sensor_code}</code>
              <button onClick={() => copySensorCode(selectedSensor.sensor_code)}><Copy className="w-3.5 h-3.5 text-muted-foreground" /></button>
              {protocolBadge(selectedSensor.protocol)}
            </div>
            <div className="space-y-3">
              <div className="bg-muted/40 p-3 rounded-xl">
                <p className="text-xs font-semibold mb-1">Protocol</p>
                <p className="text-sm">{getProtocolInfo(selectedSensor.protocol).icon} {getProtocolInfo(selectedSensor.protocol).label}</p>
              </div>
              {selectedSensor.protocol === "lora" && (
                <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/20">
                  <p className="text-xs font-semibold mb-1">LoRa Configuration</p>
                  <p className="text-[11px] text-muted-foreground mb-1">Device EUI: <code className="text-foreground">{selectedSensor.gateway_id || "Not set"}</code></p>
                  <p className="text-[11px] text-muted-foreground">Webhook URL:</p>
                  <code className="text-[10px] break-all text-foreground">{getApiEndpoint("lora-webhook")}</code>
                  <p className="text-[10px] text-muted-foreground mt-2">Configure this URL as an HTTP integration in your TTN/Chirpstack console.</p>
                </div>
              )}
              {selectedSensor.protocol === "mqtt" && (
                <div className="bg-violet-500/5 p-3 rounded-xl border border-violet-500/20">
                  <p className="text-xs font-semibold mb-1">MQTT Configuration</p>
                  <p className="text-[11px] text-muted-foreground">Topic: <code className="text-foreground">{selectedSensor.mqtt_topic || `agroeye/${selectedSensor.sensor_code}/data`}</code></p>
                </div>
              )}
              {(selectedSensor.protocol === "wifi" || !selectedSensor.protocol) && (
                <div className="bg-muted/40 p-3 rounded-xl"><p className="text-xs font-semibold mb-1">API Endpoint</p><code className="text-[10px] break-all">{getApiEndpoint()}</code></div>
              )}
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => downloadSketch(selectedSensor)}><Download className="w-4 h-4 mr-1" />{t("sensors.downloadSketch")}</Button>
                <Button variant="outline" onClick={() => copyQRPayload(selectedSensor)}><QrCode className="w-4 h-4 mr-1" />QR</Button>
              </div>
            </div>
            <Button variant="secondary" className="w-full mt-4 rounded-xl" onClick={() => setShowSetup(false)}>{t("common.close")}</Button>
          </div>
        </div>
      )}

      <BottomNav />
    </PageTransition>
  );
};

export default Sensors;
