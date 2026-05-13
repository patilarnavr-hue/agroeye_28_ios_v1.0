import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Crop {
  id: string;
  name: string;
  crop_type: string;
}

interface CropSelectorProps {
  value?: string;
  onChange: (cropId: string | null) => void;
}

const CropSelector = ({ value, onChange }: CropSelectorProps) => {
  const [crops, setCrops] = useState<Crop[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCrops();
  }, []);

  const fetchCrops = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('crops')
      .select('id, name, crop_type')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name');

    if (data) setCrops(data);
  };

  return (
    <div className="flex gap-2">
      <Select value={value || "all"} onValueChange={(val) => onChange(val === "all" ? null : val)}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="All Crops" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Crops</SelectItem>
          {crops.map((crop) => (
            <SelectItem key={crop.id} value={crop.id}>
              {crop.name} ({crop.crop_type})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="icon" variant="outline" onClick={() => navigate('/crops')}>
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default CropSelector;