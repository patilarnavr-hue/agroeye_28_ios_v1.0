import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, LogOut, Mail, Download, Bell, Trash2, Globe, Camera, MapPin, CalendarDays, Activity, Moon, Sun, Languages, Info, Shield, HelpCircle, Droplet, Bug, Mic, Volume2 } from "lucide-react";
import ProfileRankCard from "@/components/ProfileRankCard";
import { toast } from "sonner";
import { useTheme } from "@/components/ThemeProvider";
import BottomNav from "@/components/BottomNav";
import { BiometricSetup } from "@/components/BiometricSetup";
import { saveNotificationPrefs } from "@/utils/pushNotifications";
import { Skeleton } from "@/components/ui/skeleton";
import { PullToRefresh } from "@/components/PullToRefresh";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const Profile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    enabled: true, moisture: true, schedule: true, alerts: true, irrigation: true, pest: true
  });
  const [voiceResponseEnabled, setVoiceResponseEnabled] = useState(() => {
    return localStorage.getItem("agroeye_voice_responses") !== "false";
  });
  const [userId, setUserId] = useState("");
  const [userStats, setUserStats] = useState({ daysActive: 0, totalReadings: 0, totalCrops: 0 });

  useEffect(() => {
    Promise.all([fetchProfile(), fetchUserStats(), checkNotificationPermission()]).then(() => setLoading(false));
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    setEmail(user.email || "");
    const { data: profile } = await supabase.from("profiles").select("full_name, bio, location, avatar_url").eq("id", user.id).maybeSingle();
    if (profile) {
      setFullName(profile.full_name || "");
      setBio(profile.bio || "");
      setLocation(profile.location || "");
      setAvatarUrl(profile.avatar_url || "");
    }
    const { data: prefs } = await supabase.from("user_preferences").select("*").eq("user_id", user.id).single();
    if (prefs) {
      const ns = {
        enabled: prefs.notifications_enabled ?? true,
        moisture: prefs.notification_moisture ?? true,
        schedule: prefs.notification_schedule ?? true,
        alerts: prefs.notification_alerts ?? true,
        irrigation: true,
        pest: true,
      };
      setNotificationSettings(ns);
      saveNotificationPrefs(ns);
    }
  };

  const fetchUserStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [moistureData, fertilityData, cropsData, profileData] = await Promise.all([
      supabase.from("moisture_readings").select("id", { count: "exact" }).eq("user_id", user.id),
      supabase.from("fertility_readings").select("id", { count: "exact" }).eq("user_id", user.id),
      supabase.from("crops").select("id", { count: "exact" }).eq("user_id", user.id),
      supabase.from("profiles").select("created_at").eq("id", user.id).single(),
    ]);
    const totalReadings = (moistureData.count || 0) + (fertilityData.count || 0);
    let daysActive = 0;
    if (profileData.data?.created_at) {
      daysActive = Math.floor((Date.now() - new Date(profileData.data.created_at).getTime()) / 86400000);
    }
    setUserStats({ daysActive, totalReadings, totalCrops: cropsData.count || 0 });
  };

  const checkNotificationPermission = async () => {
    if ("Notification" in window) setNotificationsEnabled(Notification.permission === "granted");
  };

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) { toast.error("Notifications not supported"); return; }
    const permission = await Notification.requestPermission();
    if (permission === "granted") { setNotificationsEnabled(true); toast.success("Notifications enabled"); }
    else toast.error("Permission denied");
  };

  const exportData = async (format: "json" | "csv" = "json") => {
    setSaving(true);
    try {
      const { exportUserData } = await import("@/utils/deviceExport");
      const result = await exportUserData(userId, format);
      if (result.method === "device") {
        toast.success(`Saved to ${result.path}`, { description: "Check your Documents/AgroEye folder" });
      } else {
        toast.success(t("common.dataExported"));
      }
    } catch { toast.error("Failed to export data"); }
    setSaving(false);
  };

  const clearAllData = async () => {
    setSaving(true);
    try {
      await Promise.all([
        supabase.from("moisture_readings").delete().eq("user_id", userId),
        supabase.from("fertility_readings").delete().eq("user_id", userId),
        supabase.from("watering_schedules").delete().eq("user_id", userId),
        supabase.from("alerts").delete().eq("user_id", userId),
        supabase.from("health_scores").delete().eq("user_id", userId),
      ]);
      toast.success(t("common.allDataCleared"));
    } catch { toast.error("Failed to clear data"); }
    setSaving(false);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
      setAvatarUrl(publicUrl);
      toast.success("Avatar updated!");
    } catch { toast.error("Failed to upload avatar"); }
    finally { setUploading(false); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ full_name: fullName, bio, location }).eq("id", user.id);
    await supabase.from("user_preferences").upsert({
      user_id: user.id,
      notifications_enabled: notificationSettings.enabled,
      notification_moisture: notificationSettings.moisture,
      notification_schedule: notificationSettings.schedule,
      notification_alerts: notificationSettings.alerts,
    }, { onConflict: "user_id" });
    saveNotificationPrefs(notificationSettings);
    toast.success(t("common.profileUpdated"));
    setSaving(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success(t("common.signedOut"));
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="glass-header text-primary-foreground px-6 pt-14 pb-5">
          <div className="flex items-center gap-3"><User className="w-7 h-7" /><div><h1 className="text-[22px] font-bold tracking-tight">{t("profile.title")}</h1></div></div>
        </header>
        <main className="p-4 space-y-4 max-w-lg mx-auto">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="glass-header text-primary-foreground px-6 pt-14 pb-5">
        <div className="flex items-center gap-3">
          <User className="w-7 h-7" />
          <div>
            <h1 className="text-[22px] font-bold tracking-tight">{t("profile.title")}</h1>
            <p className="text-[13px] opacity-75">{t("profile.account")}</p>
          </div>
        </div>
      </header>

      <PullToRefresh onRefresh={async () => { await Promise.all([fetchProfile(), fetchUserStats()]); }} className="flex-1 overflow-y-auto">
      <main className="p-4 space-y-4 max-w-lg mx-auto animate-fade-in">
        {/* Stats */}
        <Card className="glass-card">
          <CardContent className="pt-5 grid grid-cols-3 gap-4">
            <div className="text-center">
              <CalendarDays className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">{userStats.daysActive}</p>
              <p className="text-[10px] text-muted-foreground">{t("profile.daysActive")}</p>
            </div>
            <div className="text-center">
              <Activity className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">{userStats.totalReadings}</p>
              <p className="text-[10px] text-muted-foreground">{t("profile.readings")}</p>
            </div>
            <div className="text-center">
              <Globe className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">{userStats.totalCrops}</p>
              <p className="text-[10px] text-muted-foreground">{t("nav.crops")}</p>
            </div>
          </CardContent>
        </Card>

        <ProfileRankCard />

        {/* Avatar */}
        <Card className="glass-card">
          <CardContent className="pt-5 flex flex-col items-center gap-3">
            <Avatar className="w-20 h-20">
              <AvatarImage src={avatarUrl} alt={fullName} />
              <AvatarFallback className="text-xl">{fullName.split(" ").map(n => n[0]).join("").toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Camera className="w-4 h-4 mr-1" /> {uploading ? t("profile.uploading") : t("profile.changeAvatar")}
            </Button>
          </CardContent>
        </Card>

        {/* Account Form */}
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t("profile.account")}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">{t("profile.fullName")}</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="rounded-xl h-10" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("profile.email")}</Label>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <Input value={email} disabled className="flex-1 rounded-xl h-10" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("profile.locationLabel")}</Label>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("profile.locationPlaceholder")} className="flex-1 rounded-xl h-10" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("profile.bio")}</Label>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t("profile.bioPlaceholder")} rows={2} className="rounded-xl" />
              </div>
              <Button type="submit" className="w-full rounded-xl h-10" disabled={saving}>
                {saving ? t("common.saving") : t("profile.updateProfile")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t("profile.settings")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {theme === "dark" ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
                <Label className="text-sm">{t("profile.theme")}</Label>
              </div>
              <Switch checked={theme === "dark"} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Languages className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm">{t("profile.language")}</Label>
              </div>
              <Select value={i18n.language} onValueChange={(v) => i18n.changeLanguage(v)}>
                <SelectTrigger className="w-28 h-9 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">हिन्दी</SelectItem>
                  <SelectItem value="mr">मराठी</SelectItem>
                  <SelectItem value="ur">اردو</SelectItem>
                  <SelectItem value="ta">தமிழ்</SelectItem>
                  <SelectItem value="te">తెలుగు</SelectItem>
                  <SelectItem value="kn">ಕನ್ನಡ</SelectItem>
                  <SelectItem value="bn">বাংলা</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm">{t("profile.notifications")}</Label>
              </div>
              <Switch checked={notificationsEnabled} onCheckedChange={(checked) => { if (checked) requestNotificationPermission(); else toast.info("Disable in browser settings"); }} />
            </div>

            <div className="pt-3 border-t border-border/50">
              <h3 className="font-semibold mb-2 text-xs text-muted-foreground uppercase tracking-wider">{t("profile.notificationPreferences")}</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">{t("profile.notificationsEnabled")}</Label>
                  <Switch checked={notificationSettings.enabled} onCheckedChange={(c) => setNotificationSettings({ ...notificationSettings, enabled: c })} />
                </div>
                {notificationSettings.enabled && (
                  <>
                    <div className="flex items-center justify-between pl-3">
                      <Label className="text-xs">{t("profile.moistureAlerts")}</Label>
                      <Switch checked={notificationSettings.moisture} onCheckedChange={(c) => setNotificationSettings({ ...notificationSettings, moisture: c })} />
                    </div>
                    <div className="flex items-center justify-between pl-3">
                      <Label className="text-xs">{t("profile.scheduleReminders")}</Label>
                      <Switch checked={notificationSettings.schedule} onCheckedChange={(c) => setNotificationSettings({ ...notificationSettings, schedule: c })} />
                    </div>
                    <div className="flex items-center justify-between pl-3">
                      <Label className="text-xs">{t("profile.generalAlerts")}</Label>
                      <Switch checked={notificationSettings.alerts} onCheckedChange={(c) => {
                        const ns = { ...notificationSettings, alerts: c };
                        setNotificationSettings(ns);
                        saveNotificationPrefs(ns);
                      }} />
                    </div>
                    <div className="flex items-center justify-between pl-3">
                      <div className="flex items-center gap-1.5">
                        <Droplet className="w-3 h-3 text-muted-foreground" />
                        <Label className="text-xs">{t("profile.irrigationAlerts")}</Label>
                      </div>
                      <Switch checked={notificationSettings.irrigation} onCheckedChange={(c) => {
                        const ns = { ...notificationSettings, irrigation: c };
                        setNotificationSettings(ns);
                        saveNotificationPrefs(ns);
                      }} />
                    </div>
                    <div className="flex items-center justify-between pl-3">
                      <div className="flex items-center gap-1.5">
                        <Bug className="w-3 h-3 text-muted-foreground" />
                        <Label className="text-xs">{t("profile.pestAlerts")}</Label>
                      </div>
                      <Switch checked={notificationSettings.pest} onCheckedChange={(c) => {
                        const ns = { ...notificationSettings, pest: c };
                        setNotificationSettings(ns);
                        saveNotificationPrefs(ns);
                      }} />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Voice & Chat Settings */}
            <div className="pt-3 border-t border-border/50">
              <h3 className="font-semibold mb-2 text-xs text-muted-foreground uppercase tracking-wider">{t("profile.voiceAndChat")}</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-xs">{t("profile.voiceResponses")}</Label>
                  </div>
                  <Switch checked={voiceResponseEnabled} onCheckedChange={(c) => {
                    setVoiceResponseEnabled(c);
                    localStorage.setItem("agroeye_voice_responses", c.toString());
                    toast.info(c ? t("profile.voiceOn") : t("profile.voiceOff"));
                  }} />
                </div>
                <p className="text-[10px] text-muted-foreground pl-6">
                  {t("profile.voiceDesc")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t("profile.dataManagement")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-primary/5 rounded-xl p-3 border border-primary/10">
              <p className="text-xs text-muted-foreground">
                {t("profile.exportDesc")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => exportData("json")} disabled={saving}>
                <Download className="w-4 h-4 mr-2" /> JSON
              </Button>
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => exportData("csv")} disabled={saving}>
                <Download className="w-4 h-4 mr-2" /> CSV
              </Button>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full rounded-xl text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" /> {t("profile.clearData")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("profile.clearConfirmTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("profile.clearConfirmDesc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={clearAllData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">{t("profile.deleteAll")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Biometric Setup */}
        {userId && <BiometricSetup userId={userId} />}

        {/* App Info */}
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Info className="w-4 h-4" />{t("profile.appInformation")}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">{t("profile.appName")}</span><span className="font-medium">{t("app.name")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("profile.version")}</span><span className="font-medium">2.0.0</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("profile.platform")}</span><span className="font-medium">PWA (Mobile)</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("profile.languages")}</span><span className="font-medium">{t("profile.languagesSupported")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("profile.dataSecurity")}</span><span className="font-medium flex items-center gap-1"><Shield className="w-3 h-3 text-primary" />{t("profile.rlsProtected")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("profile.features")}</span><span className="font-medium">{t("profile.featuresValue")}</span></div>
            <div className="pt-2 border-t border-border/50 space-y-2">
              <p className="text-xs text-muted-foreground">{t("app.aboutDescription")}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => navigate("/about")}>
                  About AgroEye
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => navigate("/terms")}>
                  Terms of Service
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => navigate("/privacy")}>
                  Privacy Policy
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => navigate("/licenses")}>
                  Open Source Licenses
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delete Account */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full rounded-xl h-11 text-destructive hover:text-destructive border-destructive/30">
              <Trash2 className="w-5 h-5 mr-2" /> Delete Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Your Account?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your account and all associated data including crops, readings, schedules, and sensor data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  try {
                    await Promise.all([
                      supabase.from("moisture_readings").delete().eq("user_id", userId),
                      supabase.from("fertility_readings").delete().eq("user_id", userId),
                      supabase.from("watering_schedules").delete().eq("user_id", userId),
                      supabase.from("alerts").delete().eq("user_id", userId),
                      supabase.from("health_scores").delete().eq("user_id", userId),
                      supabase.from("crops").delete().eq("user_id", userId),
                      supabase.from("sensors").delete().eq("user_id", userId),
                      supabase.from("pest_detections").delete().eq("user_id", userId),
                      supabase.from("irrigation_events").delete().eq("user_id", userId),
                      supabase.from("storage_requests").delete().eq("user_id", userId),
                      supabase.from("farmer_xp").delete().eq("user_id", userId),
                      supabase.from("achievements").delete().eq("user_id", userId),
                      supabase.from("user_preferences").delete().eq("user_id", userId),
                      supabase.from("farmland_plots").delete().eq("user_id", userId),
                      supabase.from("map_markers").delete().eq("user_id", userId),
                      supabase.from("weather_data").delete().eq("user_id", userId),
                      supabase.from("profiles").delete().eq("id", userId),
                    ]);
                    await supabase.auth.signOut();
                    toast.success("Account deleted successfully");
                    navigate("/auth");
                  } catch {
                    toast.error("Failed to delete account");
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              >
                Delete Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button variant="destructive" className="w-full rounded-xl h-11" onClick={handleSignOut}>
          <LogOut className="w-5 h-5 mr-2" /> {t("profile.signOut")}
        </Button>
      </main>
      </PullToRefresh>

      <BottomNav />
    </div>
  );
};

export default Profile;
