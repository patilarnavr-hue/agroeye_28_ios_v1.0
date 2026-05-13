import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, AlertTriangle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Alert {
  id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const AlertsPanel = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchAlerts();
    checkAndCreateAlerts();

    // Subscribe to new alerts
    const channel = supabase
      .channel('alerts-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'alerts'
      }, () => {
        fetchAlerts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAlerts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) setAlerts(data as Alert[]);
  };

  const checkAndCreateAlerts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check moisture levels
    const { data: moistureData } = await supabase
      .from('moisture_readings')
      .select('moisture_level')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (moistureData && moistureData.moisture_level < 30) {
      await supabase.from('alerts').insert({
        user_id: user.id,
        alert_type: 'moisture',
        severity: 'high',
        title: 'Low Soil Moisture',
        message: `Soil moisture is at ${moistureData.moisture_level}%. Consider watering soon.`
      });
    }

    // Check fertility levels
    const { data: fertilityData } = await supabase
      .from('fertility_readings')
      .select('overall_fertility')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fertilityData && fertilityData.overall_fertility < 40) {
      await supabase.from('alerts').insert({
        user_id: user.id,
        alert_type: 'fertility',
        severity: 'medium',
        title: 'Low Soil Fertility',
        message: `Soil fertility is at ${fertilityData.overall_fertility}%. Consider fertilizing.`
      });
    }
  };

  const markAsRead = async (alertId: string) => {
    await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('id', alertId);
    
    fetchAlerts();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const unreadCount = alerts.filter(a => !a.is_read).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Alerts
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {unreadCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="w-4 h-4" />
            No active alerts
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 border rounded-lg space-y-2 ${
                  alert.is_read ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium text-sm">{alert.title}</span>
                  </div>
                  <Badge variant={getSeverityColor(alert.severity)} className="text-xs">
                    {alert.severity}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{alert.message}</p>
                {!alert.is_read && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => markAsRead(alert.id)}
                    className="w-full"
                  >
                    Mark as Read
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AlertsPanel;