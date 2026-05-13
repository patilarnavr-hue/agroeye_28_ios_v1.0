import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { calculateCropIntelligence, CropIntelligenceResult } from "@/engine/cropIntelligenceEngine";

export const useCropIntelligence = (cropId?: string | null) => {
  const [result, setResult] = useState<CropIntelligenceResult>({
    healthScore: 0,
    riskIndex: 100,
    yieldPrediction: "poor",
    pestRisk: "low",
    harvestReadiness: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const compute = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Moisture
      const mq = supabase.from("moisture_readings").select("moisture_level").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
      if (cropId) mq.eq("crop_id", cropId);
      const { data: md } = await mq.single();

      // Fertility
      const fq = supabase.from("fertility_readings").select("overall_fertility").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
      if (cropId) fq.eq("crop_id", cropId);
      const { data: fd } = await fq.single();

      // Crop growth days
      let growthDays = 0;
      let expectedGrowthDays = 120;
      if (cropId) {
        const { data: crop } = await supabase.from("crops").select("planting_date, expected_harvest_date").eq("id", cropId).single();
        if (crop?.planting_date) {
          growthDays = Math.floor((Date.now() - new Date(crop.planting_date).getTime()) / 86400000);
          if (crop.expected_harvest_date) {
            expectedGrowthDays = Math.floor((new Date(crop.expected_harvest_date).getTime() - new Date(crop.planting_date).getTime()) / 86400000);
          }
        }
      }

      const intelligence = calculateCropIntelligence({
        moisture: md?.moisture_level ?? null,
        fertility: fd?.overall_fertility ?? null,
        temperature: null,
        humidity: null,
        growthDays,
        expectedGrowthDays,
      });

      setResult(intelligence);
      setLoading(false);
    };

    compute();
  }, [cropId]);

  return { ...result, loading };
};
