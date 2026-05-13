import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface StorageRequest {
  id: string;
  crop_type: string;
  quantity_kg: number;
  harvest_date: string;
  status: string;
  suitability_score: number | null;
  suitability_notes: string | null;
  created_at: string;
}

const StorageStatusPanel = () => {
  const [requests, setRequests] = useState<StorageRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await (supabase as any)
      .from("storage_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    setRequests((data as StorageRequest[]) || []);
    setLoading(false);
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    approved: "bg-primary/10 text-primary",
    rejected: "bg-destructive/10 text-destructive",
  };

  if (loading) return <Skeleton className="h-32 w-full rounded-2xl" />;
  if (requests.length === 0) return null;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Package className="w-4 h-4" /> Storage Requests
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {requests.map(r => (
          <div key={r.id} className="p-3 bg-muted/40 rounded-xl">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-sm">{r.crop_type}</span>
              <Badge className={statusColors[r.status] || "bg-muted"}>{r.status}</Badge>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{r.quantity_kg} kg</span>
              <span>Harvest: {new Date(r.harvest_date).toLocaleDateString()}</span>
            </div>
            {r.suitability_notes && (
              <p className="text-[10px] text-muted-foreground mt-1">{r.suitability_notes}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default StorageStatusPanel;
