import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import EmptyState from "@/components/EmptyState";
import { PullToRefresh } from "@/components/PullToRefresh";

interface Schedule {
  id: string;
  title: string;
  days_of_week: string[];
  time_of_day: string;
  is_enabled: boolean;
  created_at: string;
}

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SchedulePage = () => {
  const { t } = useTranslation();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [title, setTitle] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchSchedules();
    const channel = supabase.channel("schedules_changes").on("postgres_changes", { event: "*", schema: "public", table: "watering_schedules" }, () => fetchSchedules()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchSchedules = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from("watering_schedules").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) toast.error("Failed to fetch schedules");
    else setSchedules(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDays.length === 0) { toast.error("Please select at least one day"); return; }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Please sign in to create schedules"); setLoading(false); return; }
    const { error } = await supabase.from("watering_schedules").insert({ user_id: user.id, title, days_of_week: selectedDays, time_of_day: timeOfDay, is_enabled: true });
    if (error) { console.error("Schedule insert error:", error); toast.error("Failed to create schedule: " + error.message); }
    else { toast.success(t("common.success")); setTitle(""); setTimeOfDay(""); setSelectedDays([]); setDialogOpen(false); }
    setLoading(false);
  };

  const toggleDay = (day: string) => setSelectedDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);

  const toggleSchedule = async (id: string, currentState: boolean) => {
    const { error } = await supabase.from("watering_schedules").update({ is_enabled: !currentState }).eq("id", id);
    if (error) toast.error("Failed to update");
    else toast.success(currentState ? "Schedule disabled" : "Schedule enabled");
    if (!currentState && "Notification" in window && Notification.permission === "default") await Notification.requestPermission();
  };

  const deleteSchedule = async (id: string) => {
    const { error } = await supabase.from("watering_schedules").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else toast.success("Schedule deleted");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="glass-header text-primary-foreground px-6 pt-14 pb-5">
        <div className="flex items-center gap-3">
          <Calendar className="w-7 h-7" />
          <div>
            <h1 className="text-[22px] font-bold tracking-tight">{t("schedule.title")}</h1>
            <p className="text-[13px] opacity-75">{t("schedule.subtitle")}</p>
          </div>
        </div>
      </header>

      <PullToRefresh onRefresh={async () => { await fetchSchedules(); }} className="flex-1 overflow-y-auto">
      <main className="p-4 space-y-4 max-w-lg mx-auto animate-fade-in">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full rounded-2xl h-12" size="lg"><Plus className="w-5 h-5 mr-2" /> {t("schedule.addNewSchedule")}</Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl glass-card-elevated border-0">
            <DialogHeader><DialogTitle>{t("schedule.createWateringSchedule")}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[13px] text-muted-foreground">{t("schedule.scheduleName")}</Label>
                <Input placeholder={t("schedule.scheduleNamePlaceholder")} value={title} onChange={(e) => setTitle(e.target.value)} required className="rounded-xl h-11 glass-input" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] text-muted-foreground">{t("schedule.time")}</Label>
                <Input type="time" value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} required className="rounded-xl h-11 glass-input" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] text-muted-foreground">{t("schedule.daysOfWeek")}</Label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map((day) => (
                    <Button key={day} type="button" variant={selectedDays.includes(day) ? "default" : "outline"} size="sm" onClick={() => toggleDay(day)} className="rounded-full h-9 w-12 text-[13px]">{day}</Button>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full rounded-xl h-11" disabled={loading}>{loading ? t("schedule.creating") : t("schedule.createBtn")}</Button>
            </form>
          </DialogContent>
        </Dialog>

        {schedules.length === 0 ? (
          <EmptyState icon={Calendar} title={t("schedule.noSchedules")} description={t("schedule.createSchedule")} actionLabel={t("schedule.createBtn")} onAction={() => setDialogOpen(true)} />
        ) : (
          <div className="ios-grouped-section">
            {schedules.map((schedule, i) => (
              <div key={schedule.id}>
                {i > 0 && <div className="ios-separator" />}
                <div className="ios-row py-3.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><span className="text-[15px] font-semibold text-foreground">{schedule.title}</span></div>
                    <p className="text-[22px] font-bold text-primary mt-0.5">{schedule.time_of_day}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {schedule.days_of_week.map((day) => (<span key={day} className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full text-[11px] font-medium">{day}</span>))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Switch checked={schedule.is_enabled} onCheckedChange={() => toggleSchedule(schedule.id, schedule.is_enabled)} />
                    <button onClick={() => deleteSchedule(schedule.id)} className="text-destructive p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      </PullToRefresh>
      <BottomNav />
    </div>
  );
};

export default SchedulePage;
