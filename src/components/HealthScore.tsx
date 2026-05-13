import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const HealthScore = ({ cropId }: { cropId?: string | null }) => {
  const [score, setScore] = useState<number>(0);
  const [details, setDetails] = useState({
    moisture: 0,
    fertility: 0,
    weather: 0
  });

  useEffect(() => {
    calculateHealthScore();
  }, [cropId]);

  const calculateHealthScore = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch latest readings
    const moistureQuery = supabase
      .from('moisture_readings')
      .select('moisture_level')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (cropId) moistureQuery.eq('crop_id', cropId);
    
    const { data: moistureData } = await moistureQuery.single();

    const fertilityQuery = supabase
      .from('fertility_readings')
      .select('overall_fertility')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (cropId) fertilityQuery.eq('crop_id', cropId);
    
    const { data: fertilityData } = await fertilityQuery.single();

    // Calculate individual scores
    const moistureScore = moistureData ? 
      (moistureData.moisture_level >= 40 && moistureData.moisture_level <= 70 ? 100 : 
       moistureData.moisture_level < 40 ? moistureData.moisture_level * 2 : 
       (100 - moistureData.moisture_level) * 2) : 0;

    const fertilityScore = fertilityData ? fertilityData.overall_fertility : 0;
    const weatherScore = 75; // Placeholder - can be enhanced with actual weather impact

    // Calculate overall score
    const overallScore = Math.round(
      (moistureScore * 0.4 + fertilityScore * 0.4 + weatherScore * 0.2)
    );

    setScore(overallScore);
    setDetails({
      moisture: Math.round(moistureScore),
      fertility: Math.round(fertilityScore),
      weather: weatherScore
    });

    // Store health score
    if (overallScore > 0) {
      await supabase.from('health_scores').insert({
        user_id: user.id,
        crop_id: cropId || null,
        overall_score: overallScore,
        moisture_score: moistureScore,
        fertility_score: fertilityScore,
        weather_score: weatherScore
      });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Poor";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5" />
          Crop Health Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className={`text-5xl font-bold ${getScoreColor(score)}`}>
            {score}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {getScoreLabel(score)}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Moisture</span>
              <span>{details.moisture}%</span>
            </div>
            <Progress value={details.moisture} />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Fertility</span>
              <span>{details.fertility}%</span>
            </div>
            <Progress value={details.fertility} />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Weather Conditions</span>
              <span>{details.weather}%</span>
            </div>
            <Progress value={details.weather} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HealthScore;