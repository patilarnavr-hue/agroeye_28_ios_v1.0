import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Warehouse } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calculateStorageSuitability } from "@/engine/storageSuitabilityEngine";

const CROP_TYPES = ["Rice", "Wheat", "Corn", "Vegetables", "Fruits", "Pulses"];

const RequestStorageCard = () => {
  const [cropType, setCropType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [harvestDate, setHarvestDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cropType || !quantity || !harvestDate) {
      toast.error("Fill all fields");
      return;
    }

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }

    // Calculate suitability with assumed ambient conditions
    const suitability = calculateStorageSuitability(65, 25, cropType);

    const { error } = await (supabase as any).from("storage_requests").insert({
      user_id: user.id,
      crop_type: cropType,
      quantity_kg: parseFloat(quantity),
      harvest_date: harvestDate,
      suitability_score: suitability.score,
      suitability_notes: suitability.message,
      status: "pending",
    });

    if (error) {
      toast.error("Failed to submit request");
    } else {
      toast.success("Storage request submitted!");
      setCropType("");
      setQuantity("");
      setHarvestDate("");
    }
    setSubmitting(false);
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Warehouse className="w-4 h-4" /> Request Storage
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Crop Type</Label>
            <Select value={cropType} onValueChange={setCropType}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select crop" /></SelectTrigger>
              <SelectContent>
                {CROP_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Quantity (kg)</Label>
            <Input type="number" min="1" placeholder="e.g. 500" value={quantity} onChange={e => setQuantity(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Harvest Date</Label>
            <Input type="date" value={harvestDate} onChange={e => setHarvestDate(e.target.value)} className="rounded-xl" />
          </div>
          <Button type="submit" className="w-full rounded-xl" disabled={submitting}>
            {submitting ? "Submitting..." : "Request Storage"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default RequestStorageCard;
