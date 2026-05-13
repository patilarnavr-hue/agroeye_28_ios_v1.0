import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowLeft, TrendingUp, Droplets, Leaf } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Crop { id: string; name: string; crop_type: string; }
interface CropStats { crop_id: string; crop_name: string; avg_moisture: number; avg_fertility: number; reading_count: number; latest_reading: string; }

const CropComparison = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [stats, setStats] = useState<CropStats[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<'moisture' | 'fertility'>('moisture');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    const { data: cropsData } = await supabase.from('crops').select('id, name, crop_type').eq('user_id', user.id).eq('is_active', true);
    if (cropsData && cropsData.length > 0) { setCrops(cropsData); await fetchStats(cropsData); }
    setLoading(false);
  };

  const fetchStats = async (cropsData: Crop[]) => {
    const statsPromises = cropsData.map(async (crop) => {
      const [moistureRes, fertilityRes] = await Promise.all([supabase.from('moisture_readings').select('moisture_level, created_at').eq('crop_id', crop.id).order('created_at', { ascending: false }).limit(10), supabase.from('fertility_readings').select('overall_fertility, created_at').eq('crop_id', crop.id).order('created_at', { ascending: false }).limit(10)]);
      const moistureData = moistureRes.data || [], fertilityData = fertilityRes.data || [];
      return { crop_id: crop.id, crop_name: crop.name, avg_moisture: Math.round(moistureData.length ? moistureData.reduce((s, r) => s + r.moisture_level, 0) / moistureData.length : 0), avg_fertility: Math.round(fertilityData.length ? fertilityData.reduce((s, r) => s + (r.overall_fertility || 0), 0) / fertilityData.length : 0), reading_count: moistureData.length + fertilityData.length, latest_reading: moistureData[0]?.created_at || fertilityData[0]?.created_at || '' };
    });
    setStats(await Promise.all(statsPromises));
  };

  const chartData = stats.map(stat => ({ name: stat.crop_name, [selectedMetric]: selectedMetric === 'moisture' ? stat.avg_moisture : stat.avg_fertility }));
  const getBestCrop = () => { const withData = stats.filter(s => s.reading_count > 0); if (withData.length === 0) return null; return withData.reduce((best, c) => (selectedMetric === 'moisture' ? c.avg_moisture : c.avg_fertility) > (selectedMetric === 'moisture' ? best.avg_moisture : best.avg_fertility) ? c : best); };
  const bestCrop = getBestCrop();

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="glass-header text-primary-foreground px-6 pt-14 pb-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/crops')} className="text-primary-foreground hover:bg-primary-foreground/10 rounded-full"><ArrowLeft className="w-5 h-5" /></Button>
          <TrendingUp className="w-7 h-7" />
          <div>
            <h1 className="text-[22px] font-bold tracking-tight">{t("comparison.title")}</h1>
            <p className="text-[13px] opacity-75">{t("comparison.subtitle")}</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-lg mx-auto animate-fade-in">
        {loading ? (
          <Card className="glass-card"><CardContent className="pt-6 text-center text-muted-foreground"><p>{t("common.loading")}</p></CardContent></Card>
        ) : crops.length === 0 ? (
          <Card className="glass-card"><CardContent className="pt-6 text-center text-muted-foreground"><p>No crops found.</p><Button className="mt-4 rounded-xl" onClick={() => navigate('/crops')}>{t("nav.crops")}</Button></CardContent></Card>
        ) : stats.every(s => s.reading_count === 0) ? (
          <Card className="glass-card"><CardContent className="pt-6 text-center text-muted-foreground"><p>No readings available yet.</p></CardContent></Card>
        ) : (
          <>
            <Card className="glass-card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-[15px]">
                  <span>Performance</span>
                  <Select value={selectedMetric} onValueChange={(v: 'moisture' | 'fertility') => setSelectedMetric(v)}>
                    <SelectTrigger className="w-36 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="moisture"><div className="flex items-center gap-2"><Droplets className="w-4 h-4" /> {t("widgets.moisture")}</div></SelectItem>
                      <SelectItem value="fertility"><div className="flex items-center gap-2"><Leaf className="w-4 h-4" /> {t("widgets.fertility")}</div></SelectItem>
                    </SelectContent>
                  </Select>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip /><Legend /><Bar dataKey={selectedMetric} fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name={selectedMetric === 'moisture' ? 'Avg Moisture (%)' : 'Avg Fertility (%)'} /></BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            {bestCrop && (
              <Card className="glass-card-elevated border-primary/20"><CardContent className="pt-5"><p className="text-[13px] text-muted-foreground">🏆 Top Performer</p><p className="text-xl font-bold mt-1">{bestCrop.crop_name}</p><p className="text-[13px] text-muted-foreground">{selectedMetric === 'moisture' ? `${bestCrop.avg_moisture}% avg moisture` : `${bestCrop.avg_fertility}% avg fertility`}</p></CardContent></Card>
            )}
            <div className="ios-grouped-section">
              {stats.sort((a, b) => (selectedMetric === 'moisture' ? b.avg_moisture - a.avg_moisture : b.avg_fertility - a.avg_fertility)).map((stat, i) => (<div key={stat.crop_id}>{i > 0 && <div className="ios-separator" />}<div className="ios-row py-3"><span className="text-[13px] font-bold text-muted-foreground w-6">#{i + 1}</span><div className="flex-1"><span className="text-[15px] font-semibold">{stat.crop_name}</span><p className="text-[11px] text-muted-foreground">{stat.reading_count} readings</p></div><div className="text-right"><p className="text-[15px] font-bold">{selectedMetric === 'moisture' ? stat.avg_moisture : stat.avg_fertility}%</p></div></div></div>))}
            </div>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default CropComparison;
