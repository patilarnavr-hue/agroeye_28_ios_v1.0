import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Trophy, Flame, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";

const getLevelTitle = (level: number) => {
  if (level >= 20) return "Legendary Farmer";
  if (level >= 15) return "Master Cultivator";
  if (level >= 10) return "Expert Grower";
  if (level >= 7) return "Skilled Farmer";
  if (level >= 5) return "Rising Farmer";
  if (level >= 3) return "Apprentice";
  return "Seedling";
};

const ProfileRankCard = () => {
  const navigate = useNavigate();
  const [xpData, setXpData] = useState<{ total_xp: number; streak_days: number; level: number } | null>(null);
  const [rank, setRank] = useState(0);
  const [achievementCount, setAchievementCount] = useState(0);

  useEffect(() => {
    loadRankData();
  }, []);

  const loadRankData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [xpRes, leaderboardRes, achRes] = await Promise.all([
      supabase.from("farmer_xp").select("total_xp, streak_days, level").eq("user_id", user.id).maybeSingle(),
      supabase.from("farmer_xp").select("user_id, total_xp").order("total_xp", { ascending: false }).limit(100),
      supabase.from("achievements").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);

    if (xpRes.data) setXpData(xpRes.data);
    if (leaderboardRes.data) {
      const idx = leaderboardRes.data.findIndex((r) => r.user_id === user.id);
      setRank(idx >= 0 ? idx + 1 : 0);
    }
    setAchievementCount(achRes.count || 0);
  };

  if (!xpData) return null;

  const xpInLevel = xpData.total_xp % 100;
  const title = getLevelTitle(xpData.level);

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" /> Farmer Rank
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold">{title}</p>
            <div className="flex gap-2 mt-1">
              <Badge variant="default">Level {xpData.level}</Badge>
              {rank > 0 && <Badge variant="secondary">Rank #{rank}</Badge>}
            </div>
          </div>
          <div className="text-3xl">🌾</div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{xpData.total_xp} XP</span>
            <span>{100 - xpInLevel} XP to next level</span>
          </div>
          <Progress value={xpInLevel} className="h-2" />
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <Award className="w-4 h-4 text-primary" />
            <span>{achievementCount} achievements</span>
          </div>
          {xpData.streak_days > 0 && (
            <div className="flex items-center gap-1">
              <Flame className="w-4 h-4 text-orange-500" />
              <span>{xpData.streak_days} day streak</span>
            </div>
          )}
        </div>

        <Button variant="outline" size="sm" className="w-full" onClick={() => navigate("/leaderboard")}>
          <Trophy className="w-4 h-4 mr-2" />
          View Full Leaderboard
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProfileRankCard;
