import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Medal, Star, Flame, ArrowLeft, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

interface FarmerRank { user_id: string; total_xp: number; level: number; streak_days: number; display_name: string; }
interface Achievement { achievement_key: string; achievement_name: string; description: string | null; icon: string | null; xp_reward: number; earned_at: string; }

const ACHIEVEMENT_DEFS = [
  { key: "first_reading", name: "First Step", desc: "Record your first moisture reading", icon: "💧", xp: 10 },
  { key: "ten_readings", name: "Data Collector", desc: "Record 10 moisture readings", icon: "📊", xp: 50 },
  { key: "first_crop", name: "Seed Sower", desc: "Add your first crop", icon: "🌱", xp: 15 },
  { key: "five_crops", name: "Crop Master", desc: "Manage 5 different crops", icon: "🌾", xp: 75 },
  { key: "first_sensor", name: "Tech Farmer", desc: "Connect your first IoT sensor", icon: "📡", xp: 25 },
  { key: "seven_day_streak", name: "Consistent Farmer", desc: "Log data for 7 consecutive days", icon: "🔥", xp: 100 },
  { key: "first_fertility", name: "Soil Scientist", desc: "Log your first fertility reading", icon: "🧪", xp: 10 },
  { key: "first_plot", name: "Land Mapper", desc: "Map your first farmland plot", icon: "🗺️", xp: 20 },
  { key: "pest_detector", name: "Pest Detective", desc: "Use pest detection feature", icon: "🔍", xp: 30 },
  { key: "yield_forecaster", name: "Future Farmer", desc: "Generate a yield prediction", icon: "📈", xp: 30 },
];

const getLevelInfo = (xp: number) => { const level = Math.floor(xp / 100) + 1; return { level, xpInLevel: xp % 100, xpForNext: 100, title: getLevelTitle(level) }; };
const getLevelTitle = (level: number) => { if (level >= 20) return "Legendary Farmer"; if (level >= 15) return "Master Cultivator"; if (level >= 10) return "Expert Grower"; if (level >= 7) return "Skilled Farmer"; if (level >= 5) return "Rising Farmer"; if (level >= 3) return "Apprentice"; return "Seedling"; };
const getRankIcon = (index: number) => { if (index === 0) return <Trophy className="w-6 h-6 text-yellow-500" />; if (index === 1) return <Medal className="w-6 h-6 text-gray-400" />; if (index === 2) return <Medal className="w-6 h-6 text-amber-700" />; return <Star className="w-5 h-5 text-muted-foreground" />; };

const Leaderboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [leaderboard, setLeaderboard] = useState<FarmerRank[]>([]);
  const [myXp, setMyXp] = useState<{ total_xp: number; streak_days: number } | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return; setMyUserId(user.id);
    const { data: existingXp } = await supabase.from("farmer_xp").select("*").eq("user_id", user.id).maybeSingle();
    if (!existingXp) await supabase.from("farmer_xp").insert({ user_id: user.id, total_xp: 0, level: 1 });
    await checkAchievements(user.id);
    const { data: xpData } = await supabase.from("farmer_xp").select("user_id, total_xp, level, streak_days").order("total_xp", { ascending: false }).limit(50);
    if (xpData) { const userIds = xpData.map((x) => x.user_id); const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds); const nameMap = new Map(profiles?.map((p) => [p.id, p.full_name || "Anonymous Farmer"]) || []); setLeaderboard(xpData.map((x) => ({ ...x, display_name: nameMap.get(x.user_id) || "Anonymous Farmer" }))); }
    const { data: myData } = await supabase.from("farmer_xp").select("total_xp, streak_days").eq("user_id", user.id).single();
    if (myData) setMyXp(myData);
    const { data: achData } = await supabase.from("achievements").select("*").eq("user_id", user.id).order("earned_at", { ascending: false });
    setAchievements((achData as Achievement[]) || []);
  };

  const checkAchievements = async (userId: string) => {
    const { data: existing } = await supabase.from("achievements").select("achievement_key").eq("user_id", userId);
    const earned = new Set(existing?.map((a) => a.achievement_key) || []);
    const toAward: typeof ACHIEVEMENT_DEFS = [];
    if (!earned.has("first_reading")) { const { count } = await supabase.from("moisture_readings").select("id", { count: "exact", head: true }).eq("user_id", userId); if (count && count >= 1) toAward.push(ACHIEVEMENT_DEFS.find((a) => a.key === "first_reading")!); }
    if (!earned.has("ten_readings")) { const { count } = await supabase.from("moisture_readings").select("id", { count: "exact", head: true }).eq("user_id", userId); if (count && count >= 10) toAward.push(ACHIEVEMENT_DEFS.find((a) => a.key === "ten_readings")!); }
    if (!earned.has("first_crop")) { const { count } = await supabase.from("crops").select("id", { count: "exact", head: true }).eq("user_id", userId); if (count && count >= 1) toAward.push(ACHIEVEMENT_DEFS.find((a) => a.key === "first_crop")!); }
    if (!earned.has("five_crops")) { const { count } = await supabase.from("crops").select("id", { count: "exact", head: true }).eq("user_id", userId); if (count && count >= 5) toAward.push(ACHIEVEMENT_DEFS.find((a) => a.key === "five_crops")!); }
    if (!earned.has("first_sensor")) { const { count } = await supabase.from("sensors").select("id", { count: "exact", head: true }).eq("user_id", userId); if (count && count >= 1) toAward.push(ACHIEVEMENT_DEFS.find((a) => a.key === "first_sensor")!); }
    if (!earned.has("first_fertility")) { const { count } = await supabase.from("fertility_readings").select("id", { count: "exact", head: true }).eq("user_id", userId); if (count && count >= 1) toAward.push(ACHIEVEMENT_DEFS.find((a) => a.key === "first_fertility")!); }
    if (!earned.has("first_plot")) { const { count } = await supabase.from("farmland_plots").select("id", { count: "exact", head: true }).eq("user_id", userId); if (count && count >= 1) toAward.push(ACHIEVEMENT_DEFS.find((a) => a.key === "first_plot")!); }
    let totalNewXp = 0;
    for (const ach of toAward) { await supabase.from("achievements").insert({ user_id: userId, achievement_key: ach.key, achievement_name: ach.name, description: ach.desc, icon: ach.icon, xp_reward: ach.xp }); totalNewXp += ach.xp; }
    if (totalNewXp > 0) { const { data: currentXp } = await supabase.from("farmer_xp").select("total_xp").eq("user_id", userId).single(); const newTotal = (currentXp?.total_xp || 0) + totalNewXp; await supabase.from("farmer_xp").update({ total_xp: newTotal, level: Math.floor(newTotal / 100) + 1 }).eq("user_id", userId); }
  };

  const myRank = leaderboard.findIndex((r) => r.user_id === myUserId) + 1;
  const levelInfo = myXp ? getLevelInfo(myXp.total_xp) : null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="glass-header text-primary-foreground px-6 pt-14 pb-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-primary-foreground hover:bg-primary-foreground/10 rounded-full"><ArrowLeft className="w-5 h-5" /></Button>
          <Trophy className="w-7 h-7" />
          <div>
            <h1 className="text-[22px] font-bold tracking-tight">{t("leaderboard.title")}</h1>
            <p className="text-[13px] opacity-75">{t("leaderboard.subtitle")}</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-lg mx-auto animate-fade-in">
        {levelInfo && (
          <Card className="glass-card-elevated">
            <CardContent className="pt-6 text-center space-y-3">
              <div className="text-4xl">🌾</div>
              <h2 className="text-xl font-bold">{levelInfo.title}</h2>
              <div className="flex items-center justify-center gap-2">
                <Badge variant="default" className="text-base px-3 py-1 rounded-full">Level {levelInfo.level}</Badge>
                {myRank > 0 && <Badge variant="secondary" className="text-base px-3 py-1 rounded-full">#{myRank}</Badge>}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[13px] text-muted-foreground"><span>{myXp?.total_xp || 0} XP</span><span>{levelInfo.xpForNext} XP to next</span></div>
                <Progress value={(levelInfo.xpInLevel / levelInfo.xpForNext) * 100} className="h-2 rounded-full" />
              </div>
              {myXp && myXp.streak_days > 0 && (<div className="flex items-center justify-center gap-1 text-[13px]"><Flame className="w-4 h-4 text-orange-500" /> {myXp.streak_days} day streak!</div>)}
            </CardContent>
          </Card>
        )}

        <div className="ios-grouped-section">
          <div className="px-4 pt-3 pb-1 flex items-center gap-2"><Trophy className="w-4 h-4 text-muted-foreground" /><h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Top Farmers</h3></div>
          {leaderboard.length === 0 ? (<p className="text-center text-muted-foreground py-6 text-[13px]">No farmers ranked yet.</p>) : (
            leaderboard.map((farmer, i) => (<div key={farmer.user_id}>{i > 0 && <div className="ios-separator" />}<div className={`ios-row py-3 ${farmer.user_id === myUserId ? "bg-primary/5" : ""}`}><div className="w-8 text-center shrink-0">{getRankIcon(i)}</div><div className="flex-1 min-w-0"><p className="text-[15px] font-semibold truncate">{farmer.display_name}{farmer.user_id === myUserId && <span className="text-primary ml-1">(You)</span>}</p><p className="text-[11px] text-muted-foreground">Level {farmer.level} · {getLevelTitle(farmer.level)}</p></div><div className="text-right shrink-0"><p className="font-bold text-[15px]">{farmer.total_xp}</p><p className="text-[11px] text-muted-foreground">XP</p></div></div></div>))
          )}
        </div>

        <div className="ios-grouped-section">
          <div className="px-4 pt-3 pb-1 flex items-center gap-2"><Award className="w-4 h-4 text-muted-foreground" /><h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Achievements</h3></div>
          <div className="p-3 grid grid-cols-2 gap-2">
            {ACHIEVEMENT_DEFS.map((def) => { const isEarned = achievements.find((a) => a.achievement_key === def.key); return (
              <div key={def.key} className={`p-3 rounded-2xl text-center space-y-1 ${isEarned ? "bg-primary/8 border border-primary/15" : "bg-muted/50 opacity-50"}`}><div className="text-2xl">{def.icon}</div><p className="text-[11px] font-bold">{def.name}</p><p className="text-[9px] text-muted-foreground">{def.desc}</p><Badge variant={isEarned ? "default" : "secondary"} className="text-[9px] rounded-full">{isEarned ? `+${def.xp} XP ✓` : `${def.xp} XP`}</Badge></div>
            ); })}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Leaderboard;
